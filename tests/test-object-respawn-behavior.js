/**
 *
 * Reldens - Test Object Respawn Behavior
 *
 */

const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { ObjectRespawnBehavior } = require('../lib/respawn/server/object-respawn-behavior');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { GameConst } = require('../lib/game/constants');

class TestObjectRespawnBehavior extends RandomMovementBaseTest
{

    constructor(config)
    {
        super(config);
        this.respawnLayer = 'respawn-area-monsters-lvl-1-2';
        this.objectIndex = 'respawn-area-monsters-lvl-1-2-enemy_forest_1-1';
        this.previousTileIndex = 5;
        this.newTile = {column: 15, row: 12, tileIndex: 9};
        this.maxTiles = 2;
    }

    createRespawnedObject(updateInitialPosition)
    {
        let body = this.bodyBuilder.build();
        body.updateCurrentPoints();
        let usedTiles = {[this.previousTileIndex]: true};
        let tileData = {
            x: this.newTile.column * this.tileSize + this.tileSize / 2,
            y: this.newTile.row * this.tileSize + this.tileSize / 2
        };
        body.world.respawnAreas = {[this.respawnLayer]: {
            usedTiles,
            getRandomTile: () => ({randomTileIndex: this.newTile.tileIndex, tileData})
        }};
        body.bodyState = {inState: GameConst.STATUS.DEATH, x: body.position[0], y: body.position[1]};
        return {
            usedTiles,
            tileData,
            objInstance: {
                uid: 'enemy_forest_1-1',
                objectIndex: this.objectIndex,
                respawnLayer: this.respawnLayer,
                randomTileIndex: this.previousTileIndex,
                updateInitialPosition,
                objectBody: body
            }
        };
    }

    createRoom(initialPosition, mappedRoomData)
    {
        return {state: {
            roomData: {objectsAnimationsData: {[this.objectIndex]: Object.assign({}, initialPosition)}},
            mapRoomData: () => mappedRoomData.push(true)
        }};
    }

    async testRestoredObjectWandersAroundItsNewTile()
    {
        await this.test('a restored object gets its new respawn tile as the original tile of its random movement', async () => {
            let respawned = this.createRespawnedObject(true);
            let body = respawned.objInstance.objectBody;
            await new ObjectRespawnBehavior(respawned.objInstance).restore(this.createRoom({x: 0, y: 0}, []));
            this.assert.deepStrictEqual(
                [body.originalCol, body.originalRow, body.position, body.bodyState.inState],
                [this.newTile.column, this.newTile.row, [respawned.tileData.x, respawned.tileData.y], GameConst.STATUS.ACTIVE]
            );
            this.assert.deepStrictEqual(
                [respawned.objInstance.randomTileIndex, respawned.usedTiles],
                [this.newTile.tileIndex, {}]
            );
            let randomMovement = new ObjectRandomMovement({objectBody: body, getInBattlePlayers: () => ({}), maxTiles: this.maxTiles});
            let farTargets = [];
            for(let sample = 0; sample < 100; sample++){
                let target = randomMovement.findTargetTile();
                if(this.maxTiles < Math.abs(target.column - this.newTile.column) || this.maxTiles < Math.abs(target.row - this.newTile.row)){
                    farTargets.push(target);
                }
            }
            this.assert.deepStrictEqual(farTargets, []);
        });
    }

    async testInitialPositionUpdatedOnlyWhenEnabled()
    {
        await this.test('the room initial data gets the respawn position only with updateInitialPosition on', async () => {
            let initialPosition = {x: 10, y: 20};
            let disabledMapped = [];
            let disabledRoom = this.createRoom(initialPosition, disabledMapped);
            await new ObjectRespawnBehavior(this.createRespawnedObject(false).objInstance).restore(disabledRoom);
            let enabledMapped = [];
            let enabledRoom = this.createRoom(initialPosition, enabledMapped);
            let enabled = this.createRespawnedObject(true);
            await new ObjectRespawnBehavior(enabled.objInstance).restore(enabledRoom);
            this.assert.deepStrictEqual(
                [disabledRoom.state.roomData.objectsAnimationsData[this.objectIndex], disabledMapped.length],
                [initialPosition, 0]
            );
            this.assert.deepStrictEqual(
                [enabledRoom.state.roomData.objectsAnimationsData[this.objectIndex], enabledMapped.length],
                [{x: enabled.tileData.x, y: enabled.tileData.y}, 1]
            );
        });
    }

}

module.exports.TestObjectRespawnBehavior = TestObjectRespawnBehavior;
