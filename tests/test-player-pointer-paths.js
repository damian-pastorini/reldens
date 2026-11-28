/**
 *
 * Reldens - Test Player Pointer Paths
 *
 * Tests the player pointer paths on a real path finder grid through the scene movement: the pointer tiles clamped to
 * the map limits, the stop message during a pointer path, a second pointer target replacing the running path, a pointer
 * on the own tile, a blocked or unreachable target with onlyWalkable on or off, tryClosestPath on with a blocked
 * target on the last grid row, walking to the tile next to a blocked target on the player side, or with a blocked
 * target on the row 0 and every tile around it blocked answering no path without error, a pointer row below the grid with onlyWalkable off clamped to the last map row, and a
 * pointer to a tile on the column 0 or the row 0 walked onto (the body follows its path step by step).
 *
 */

const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { RoomScene } = require('../lib/rooms/server/scene');
const { WorldPointsValidator } = require('../lib/world/world-points-validator');
const { GameConst } = require('../lib/game/constants');

class TestPlayerPointerPaths extends RandomMovementBaseTest
{

    createPointerSetup(worldOptions)
    {
        let body = this.bodyBuilder.build();
        Object.assign(body.world, worldOptions);
        body.updateCurrentPoints();
        let room = Object.create(RoomScene.prototype);
        room.movementInterval = {};
        room.config = {get: () => true};
        room.pointsValidator = new WorldPointsValidator(body.world.mapJson.width, body.world.mapJson.height);
        return {
            body,
            room,
            playerSchema: {
                player_id: 7,
                isDeath: () => false,
                isDisabled: () => false,
                getPrivate: () => null,
                physicalBody: body
            }
        };
    }

    async pointTo(setup, column, row)
    {
        await setup.room.executeMovePlayerActions(setup.playerSchema, {act: GameConst.POINTER, column, row});
        return setup.body.autoMoving;
    }

    blockTiles(grid, tiles)
    {
        for(let tile of tiles){
            grid.setWalkableAt(tile[0], tile[1], false);
        }
    }

    enclose(grid, column, row)
    {
        let neighborOffsets = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
        this.blockTiles(grid, neighborOffsets.map(offset => [column + offset[0], row + offset[1]]));
    }

    async testThePointerTilesAreClampedToTheMap()
    {
        await this.test('a pointer column or row outside the map is clamped to the map limits', async () => {
            let validator = new WorldPointsValidator(30, 20);
            this.assert.deepStrictEqual(
                [validator.makeValidPoints({column: -3, row: -1}), validator.makeValidPoints({column: 45, row: 99})],
                [{column: 0, row: 0}, {column: 29, row: 19}]
            );
        });
    }

    async testAStopDuringAPointerPathKeepsThePath()
    {
        await this.test('a stop message during a pointer path stops the body and keeps the path to go on', async () => {
            let setup = this.createPointerSetup({});
            let path = [...await this.pointTo(setup, this.originalTile + 3, this.originalTile)];
            setup.body.velocity = [50, 0];
            await setup.room.executeMovePlayerActions(setup.playerSchema, {act: GameConst.STOP});
            this.assert.deepStrictEqual([setup.body.velocity, setup.body.autoMoving], [[0, 0], path]);
        });
    }

    async testASecondPointerTargetReplacesTheRunningPath()
    {
        await this.test('a second pointer target while the first path runs replaces it with the path to the new target', async () => {
            let setup = this.createPointerSetup({});
            await this.pointTo(setup, this.originalTile + 3, this.originalTile);
            let secondPath = await this.pointTo(setup, this.originalTile, this.originalTile + 2);
            this.assert.deepStrictEqual(
                [secondPath.length, secondPath[secondPath.length - 1]],
                [3, [this.originalTile, this.originalTile + 2]]
            );
        });
    }

    async testAPointerOnTheOwnTileEndsAtOnce()
    {
        await this.test('a pointer on the own tile ends the path at once without moving', async () => {
            let setup = this.createPointerSetup({});
            let ownTilePath = [...await this.pointTo(setup, this.originalTile, this.originalTile)];
            setup.body.speedToNext();
            this.assert.deepStrictEqual(
                [ownTilePath, setup.body.autoMoving, [...setup.body.velocity]],
                [[[this.originalTile, this.originalTile]], false, [0, 0]]
            );
        });
    }

    async testABlockedOrUnreachableTargetStopsThePlayer()
    {
        await this.test('a blocked target with onlyWalkable on or off and an unreachable one without tryClosestPath stop the player', async () => {
            let results = [];
            for(let onlyWalkable of [true, false]){
                let setup = this.createPointerSetup({onlyWalkable, tryClosestPath: false});
                setup.body.world.pathFinder.grid.setWalkableAt(this.originalTile + 3, this.originalTile, false);
                setup.body.velocity = [50, 0];
                results.push([await this.pointTo(setup, this.originalTile + 3, this.originalTile), setup.body.velocity]);
            }
            let unreachable = this.createPointerSetup({onlyWalkable: true, tryClosestPath: false});
            this.enclose(unreachable.body.world.pathFinder.grid, this.originalTile + 5, this.originalTile);
            unreachable.body.velocity = [50, 0];
            results.push([await this.pointTo(unreachable, this.originalTile + 5, this.originalTile), unreachable.body.velocity]);
            this.assert.deepStrictEqual(results, [[false, [0, 0]], [[], [0, 0]], [[], [0, 0]]]);
        });
    }

    async testTryClosestPathOnTheLastRowHasNoError()
    {
        await this.test('tryClosestPath on with a blocked target on the last grid row gives no error', async () => {
            let setup = this.createPointerSetup({onlyWalkable: false, tryClosestPath: true});
            let lastRow = setup.body.world.mapJson.height;
            let target = [this.originalTile + 5, lastRow];
            let grid = setup.body.world.pathFinder.grid;
            grid.setWalkableAt(target[0], target[1], false);
            grid.setWalkableAt(setup.body.world.mapJson.width, target[1], false);
            this.assert.strictEqual(Array.isArray(await this.pointTo(setup, target[0], target[1])), true);
        });
    }

    async testTryClosestPathEndsNextToTheBlockedTarget()
    {
        await this.test('tryClosestPath walks to the tile next to a blocked target, on the player side', async () => {
            let setup = this.createPointerSetup({onlyWalkable: false, tryClosestPath: true});
            let target = [this.originalTile + 5, this.originalTile];
            setup.body.world.pathFinder.grid.setWalkableAt(target[0], target[1], false);
            let path = await this.pointTo(setup, target[0], target[1]);
            this.assert.deepStrictEqual(path[path.length - 1], [target[0] - 1, target[1]]);
        });
    }

    async testTryClosestPathOnTheFirstRowHasNoError()
    {
        await this.test('a blocked row 0 target with blocked neighbors gives no path and no error', async () => {
            let setup = this.createPointerSetup({onlyWalkable: false, tryClosestPath: true});
            let column = this.originalTile;
            this.blockTiles(setup.body.world.pathFinder.grid, [
                [column, 0],
                [0, 0],
                [column + 1, 0],
                [column - 1, 0],
                [column, 1],
                [column + 1, 1],
                [column - 1, 1]
            ]);
            this.assert.deepStrictEqual(await this.pointTo(setup, column, 0), []);
        });
    }

    walkThePath(body)
    {
        let stepSeconds = 0.04;
        for(let step = 0; step < 500 && body.autoMoving; step++){
            body.speedToNext();
            body.position[0] += body.velocity[0] * stepSeconds;
            body.position[1] += body.velocity[1] * stepSeconds;
            body.updateCurrentPoints();
        }
        return [body.currentCol, body.currentRow, body.autoMoving];
    }

    async testAPointerToTheFirstColumnOrRowEndsOnIt()
    {
        await this.test('a pointer to a walkable tile on the column 0 or the row 0 walks the player onto it', async () => {
            let columnSetup = this.createPointerSetup({});
            await this.pointTo(columnSetup, 0, this.originalTile);
            let rowSetup = this.createPointerSetup({});
            await this.pointTo(rowSetup, this.originalTile, 0);
            this.assert.deepStrictEqual(
                [this.walkThePath(columnSetup.body), this.walkThePath(rowSetup.body)],
                [[0, this.originalTile, false], [this.originalTile, 0, false]]
            );
        });
    }

    async testAPointerBelowTheGridWithOnlyWalkableOffWalksToTheLastRow()
    {
        await this.test('a pointer row below the grid with onlyWalkable off is clamped and walks to the last map row', async () => {
            let setup = this.createPointerSetup({onlyWalkable: false, tryClosestPath: false});
            let lastRow = setup.body.world.mapJson.height - 1;
            let path = await this.pointTo(setup, this.originalTile, lastRow + 50);
            this.assert.deepStrictEqual(
                [path[path.length - 1], path.filter(step => lastRow < step[1])],
                [[this.originalTile, lastRow], []]
            );
        });
    }

}

module.exports.TestPlayerPointerPaths = TestPlayerPointerPaths;
