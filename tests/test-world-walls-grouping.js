/**
 *
 * Reldens - Test World Walls Grouping
 *
 * Tests the wall bodies the P2world creates from the map layers (a 6x6 map of 32 pixels tiles with a "collisions" layer
 * holding a wall of 3 tiles on the column 2 and a wall of 2 tiles on the row 5, and a "pathfinder" layer with one empty
 * tile): with groupWallsVertically on the column wall is one vertical body, with groupWallsHorizontally on (the sample
 * value) the row wall is one horizontal body, with both off every wall tile is its own body, and in every case a player
 * walking into the column wall from the left or the right stops beside it; an empty tile of a pathfinder layer is
 * blocked for the pointer paths without any wall body; with the rooms collisions manager a player pushed by another one
 * into the column wall ends stopped beside it and the pusher stopped beside the pushed one; a pointer path through the
 * tile of a static chest or a kinematic NPC body never pushes or crosses that body (the player keeps pushing it and never
 * stops, ISSUE #341, so only the body positions are checked); the body of a player killed by the battle leaves the
 * world on the next bodies removal and a pointer path of another player crosses its tile to the target; a dropped item
 * created by the room gets the drops collision group and the players and walls mask and the contact of a player walking
 * over it fires (the walking player pushes the drop away, ISSUE #399, so its position is not checked); and with the
 * simultaneous
 * keys and the rooms collisions manager a
 * diagonal walk into the column wall or into the top left corner stops the player outside the wall bodies (the walk
 * into the wall stops on the first wall contact end and never slides along it, ISSUE #398, so only the stop outside the
 * wall is checked). Both grouping options on are not covered here, they turn the column wall into a block as wide as it
 * is tall over the walkable tiles on its right (ISSUE #394).
 *
 */

const { Body } = require('p2');
const { WallsWorldBaseTest } = require('./fixtures/walls-world-base-test');
const { CollisionsManager } = require('../lib/world/server/collisions-manager');
const { Battle } = require('../lib/actions/server/battle');
const { DropObject } = require('../lib/objects/server/object/type/drop-object');
const { RoomScene } = require('../lib/rooms/server/scene');
const { WorldConst } = require('../lib/world/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestWorldWallsGrouping extends WallsWorldBaseTest
{

    async assertWallBodies(groupingConfig, expectedWalls)
    {
        let world = await this.createWorld(groupingConfig);
        let walls = world.bodies.filter(body => body.isWall && !body.isWorldWall).map(body => ({
            tiles: body.tileIndexes,
            center: [body.position[0], body.position[1]],
            size: [body.shapes[0].width, body.shapes[0].height]
        }));
        this.assert.deepStrictEqual(walls, expectedWalls, 'Wall bodies for '+sc.toJsonString(groupingConfig));
        let halfWalker = this.walkerSize / 2;
        let walked = this.walk(world, [
            {start: [16, this.walkerRow], directions: [GameConst.RIGHT]},
            {start: [144, this.walkerRow], directions: [GameConst.LEFT]}
        ]);
        this.assert.deepStrictEqual(
            walked.map(walkedBody => walkedBody.position),
            [
                [this.columnWallEdges[0] - halfWalker, this.walkerRow],
                [this.columnWallEdges[1] + halfWalker, this.walkerRow]
            ],
            'The column wall stops the player from both sides for '+sc.toJsonString(groupingConfig)
        );
    }

    async testTheVerticalGroupingMakesOneBodyPerWallColumn()
    {
        await this.test('groupWallsVertically on: the column wall is one vertical body and stops the player', async () => {
            await this.assertWallBodies({groupWallsVertically: true, groupWallsHorizontally: false}, [
                {tiles: [8, 14, 20], center: [80, 80], size: [32, 96]},
                {tiles: [33], center: [112, 176], size: [32, 32]},
                {tiles: [34], center: [144, 176], size: [32, 32]}
            ]);
        });
    }

    async testTheHorizontalGroupingMakesOneBodyPerWallRow()
    {
        await this.test('groupWallsHorizontally on: the row wall is one horizontal body and walls stop the player', async () => {
            await this.assertWallBodies({groupWallsVertically: false, groupWallsHorizontally: true}, [
                {tiles: [8], center: [80, 48], size: [32, 32]},
                {tiles: [14], center: [80, 80], size: [32, 32]},
                {tiles: [20], center: [80, 112], size: [32, 32]},
                {tiles: [33, 34], center: [128, 176], size: [64, 32]}
            ]);
        });
    }

    async testWithoutGroupingEveryWallTileIsABody()
    {
        await this.test('both grouping options off: every wall tile is its own body and walls stop the player', async () => {
            await this.assertWallBodies({groupWallsVertically: false, groupWallsHorizontally: false}, [
                {tiles: [8], center: [80, 48], size: [32, 32]},
                {tiles: [14], center: [80, 80], size: [32, 32]},
                {tiles: [20], center: [80, 112], size: [32, 32]},
                {tiles: [33], center: [112, 176], size: [32, 32]},
                {tiles: [34], center: [144, 176], size: [32, 32]}
            ]);
        });
    }

    async testAnEmptyPathFinderLayerTileIsBlockedWithoutWallBody()
    {
        await this.test('an empty tile of a pathfinder layer is blocked for the pointer paths with no wall body', async () => {
            let world = await this.createWorld({groupWallsVertically: false, groupWallsHorizontally: true});
            let grid = world.pathFinder.grid;
            this.assert.deepStrictEqual(
                [grid.isWalkableAt(0, 5), grid.isWalkableAt(2, 1), grid.isWalkableAt(3, 2)],
                [false, false, true]
            );
            this.assert.deepStrictEqual(
                world.bodies.filter(body => body.tileIndexes && -1 !== body.tileIndexes.indexOf(this.emptyPathFinderTile)),
                []
            );
        });
    }

    async testAPlayerPushedIntoAWallStopsWithoutOverlappingIt()
    {
        await this.test('a player pushed by another player into a wall stops both without overlapping the wall', async () => {
            let world = await this.createWorld({groupWallsVertically: true, groupWallsHorizontally: false});
            let emittedEvents = [];
            new CollisionsManager({roomWorld: world, events: {emit: (eventName) => emittedEvents.push(eventName)}});
            let halfWalker = this.walkerSize / 2;
            let [pusher, pushed] = this.walk(world, [
                {start: [16, this.walkerRow], directions: [GameConst.RIGHT]},
                {start: [40, this.walkerRow], directions: []}
            ]);
            this.assert.deepStrictEqual(
                [
                    pushed.position[0] + halfWalker <= this.columnWallEdges[0],
                    pusher.position[0] + halfWalker <= pushed.position[0] - halfWalker,
                    pushed.position[1],
                    pusher.velocity,
                    pushed.velocity
                ],
                [true, true, this.walkerRow, [0, 0], [0, 0]],
                'Both players stopped, the pushed one beside the wall and the pusher beside it: '+sc.toJsonString([pusher, pushed])
            );
            this.assert.ok(-1 !== emittedEvents.indexOf('reldens.playerHitPlayerEnd'), 'The players contact ended');
        });
    }

    async testAPointerPathNeverPushesOrCrossesAStaticOrKinematicObject()
    {
        await this.test('a pointer path into a static chest or a kinematic NPC body never pushes it or crosses it', async () => {
            let objectTile = {column: 3, row: 4, center: [112, 144]};
            for(let collisionType of [Body.STATIC, Body.KINEMATIC]){
                let world = await this.createWorld({groupWallsVertically: false, groupWallsHorizontally: true});
                new CollisionsManager({roomWorld: world, events: {emit: () => true}});
                let roomObject = await world.createWorldObject(
                    {collisionType},
                    'ground'+(objectTile.row * 6 + objectTile.column),
                    32,
                    32,
                    ...objectTile.center
                );
                let [walker] = this.walk(world, [
                    {start: [16, objectTile.center[1]], directions: [], pointTo: {column: 5, row: objectTile.row}}
                ]);
                this.assert.deepStrictEqual(
                    [
                        [roomObject.objectBody.position[0], roomObject.objectBody.position[1]],
                        walker.position[0] < objectTile.center[0] - 16,
                        walker.position[1]
                    ],
                    [objectTile.center, true, objectTile.center[1]],
                    'The object of the body type '+collisionType+' is not pushed or crossed: '+sc.toJsonString(walker)
                );
            }
        });
    }

    async testADeadPlayerBodyIsRemovedAndAPointerPathCrossesItsTile()
    {
        await this.test('a dead player body leaves the world and a pointer path of another player crosses its tile', async () => {
            let world = await this.createWorld({groupWallsVertically: false, groupWallsHorizontally: true});
            new CollisionsManager({roomWorld: world, events: {emit: () => true}});
            let deadPosition = {x: 80, y: 144};
            let deadBody = world.createPlayerBody({
                id: 'dead-player',
                width: this.walkerSize,
                height: this.walkerSize,
                speed: 0,
                bodyState: Object.assign({dir: GameConst.DOWN}, deadPosition)
            });
            let privateValues = {};
            let targetSchema = {
                player_id: 7,
                sessionId: 'dead-player',
                state: Object.assign({}, deadPosition),
                physicalBody: deadBody,
                isDeath: () => false,
                isDisabled: () => false,
                setPrivate: (key, value) => privateValues[key] = value
            };
            await new Battle({events: {}}).clientDeathUpdate(targetSchema, {
                roomWorld: world,
                deactivatePlayer: () => true,
                broadcast: () => true,
                savePlayerState: async () => true,
                savePlayerStats: async () => true,
                config: {get: () => 60000},
                events: {emit: () => true}
            }, {send: () => true}, 'hp', 'attacker');
            clearTimeout(privateValues.playerDeathTimer);
            world.removeBodiesFromWorld();
            let target = {column: 5, row: 4};
            let [walker] = this.walk(world, [{start: [16, deadPosition.y], directions: [], pointTo: target}]);
            this.assert.deepStrictEqual(
                [
                    -1 !== world.bodies.indexOf(deadBody),
                    [Math.floor(walker.position[0] / 32), Math.floor(walker.position[1] / 32)],
                    walker.velocity
                ],
                [false, [target.column, target.row], [0, 0]],
                'The walker crossed the dead player tile and stopped on its target: '+sc.toJsonString(walker)
            );
        });
    }

    async testADroppedItemGetsTheDropsGroupAndItsPlayerContactFires()
    {
        await this.test('a dropped item body gets the drops collision group and mask and a walking player contact fires', async () => {
            let world = await this.createWorld({groupWallsVertically: false, groupWallsHorizontally: true});
            let emittedEvents = [];
            new CollisionsManager({roomWorld: world, events: {emit: (eventName) => emittedEvents.push(eventName)}});
            let dropObject = new DropObject({
                events: {},
                config: {get: () => 32, getWithoutLogs: (path, defaultValue) => defaultValue},
                dataServer: {},
                client_key: 'drop-coins',
                id: 1
            });
            world.objectsManager = {getObjectData: () => dropObject, objectsAnimationsData: {}};
            let roomScene = Object.create(RoomScene.prototype, {
                objectsManager: {value: {generateObjectFromObjectData: async () => dropObject}},
                roomWorld: {value: world},
                addObjectStateSceneData: {value: () => true},
                setObjectAutoDestroyTime: {value: () => false}
            });
            await roomScene.createDropObjectInRoom({}, {
                layerName: 'drop-coins',
                tileIndex: 27,
                tileWidth: 32,
                tileHeight: 32,
                x: 112,
                y: 144
            });
            let collisions = WorldConst.COLLISIONS;
            this.assert.deepStrictEqual(
                dropObject.objectBody.shapes.map(shape => [shape.collisionGroup, shape.collisionMask]),
                [[collisions.DROP, collisions.PLAYER | collisions.WALL]]
            );
            this.walk(world, [{start: [16, 144], directions: [GameConst.RIGHT]}]);
            this.assert.ok(
                -1 !== emittedEvents.indexOf('reldens.startPlayerHitObjectBegin'),
                'The walking player contact with the drop fired: '+sc.toJsonString(emittedEvents)
            );
        });
    }

    async testADiagonalWalkIntoAWallOrACornerStopsOutsideTheWalls()
    {
        await this.test('a diagonal walk into a wall or a corner stops the player outside the wall bodies', async () => {
            let world = await this.createWorld({groupWallsVertically: true, groupWallsHorizontally: false});
            world.allowSimultaneous = true;
            let emittedEvents = [];
            new CollisionsManager({roomWorld: world, events: {emit: (eventName) => emittedEvents.push(eventName)}});
            let halfWalker = this.walkerSize / 2;
            let [intoWall] = this.walk(world, [{start: [48, 48], directions: [GameConst.RIGHT, GameConst.DOWN]}]);
            this.assert.deepStrictEqual(
                [intoWall.position[0], intoWall.velocity],
                [this.columnWallEdges[0] - halfWalker, [0, 0]],
                'The diagonal walk into the column wall stops beside it'
            );
            this.assert.ok(-1 !== emittedEvents.indexOf('reldens.endPlayerHitWallEnd'), 'The wall contact ended');
            let cornerPosition = Math.round(this.worldWallInnerEdge + halfWalker);
            this.assert.deepStrictEqual(
                this.walk(world, [{start: [48, 48], directions: [GameConst.LEFT, GameConst.UP]}]),
                [{position: [cornerPosition, cornerPosition], velocity: [0, 0]}],
                'The diagonal walk into the top left corner stops inside both world walls'
            );
        });
    }

}

module.exports.TestWorldWallsGrouping = TestWorldWallsGrouping;
