/**
 *
 * Reldens - Test World Players Collisions
 *
 * Tests the players bodies contacts with the real P2world and the rooms collisions manager on the walls world of
 * WallsWorldBaseTest (the row 4 is free of walls): two players walking into each other at the same time stop both on
 * the contact, each one beside the other and at the same distance from its start, with one players contact begin and
 * end; and a pointer path through the tile of a standing player never crosses that player and ends with both stopped
 * by the players contact end (the path keeps pushing the standing player after every contact end, up to the world
 * border, ISSUE #408, so the pushed distance is not checked); and a pointer path into an object body walking its own
 * path toward the player never crosses that object and runs its hit once (both keep pushing each other at the full
 * speed and never retry their paths, ISSUE #341, so their stop is not checked); and a pointer path into a real dynamic
 * enemy pushes the enemy without crossing it and starts one battle with the walking player (once the enemy is against
 * the world border the player keeps pushing it at the full speed, ISSUE #341, so its stop is not checked); and with the
 * simultaneous keys (the sample allowSimultaneousKeys) a player pushed one tile up and left of its path start, so its
 * next step is a diagonal over the column wall corner, restarts its path from that same step on the speed to next max
 * retries and arrives on its target (the retries also stop a diagonal step that nothing blocks, ISSUE #410).
 *
 */

const { Body } = require('p2');
const { WallsWorldBaseTest } = require('./fixtures/walls-world-base-test');
const { EnemyObjectBuilder } = require('./fixtures/enemy-object-builder');
const { CollisionsManager } = require('../lib/world/server/collisions-manager');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestWorldPlayersCollisions extends WallsWorldBaseTest
{

    constructor(config)
    {
        super(config);
        this.freeRow = 4;
        this.freeRowY = 144;
    }

    async createWorldWithCollisions(emittedEvents, roomProps = {})
    {
        let world = await this.createWorld({groupWallsVertically: false, groupWallsHorizontally: true});
        new CollisionsManager(Object.assign(
            {roomWorld: world, events: {emit: (eventName) => emittedEvents.push(eventName)}},
            roomProps
        ));
        return world;
    }

    async testTwoPlayersWalkingIntoEachOtherStopBothOnTheContact()
    {
        await this.test('two players walking into each other at the same time stop both beside each other', async () => {
            let emittedEvents = [];
            let world = await this.createWorldWithCollisions(emittedEvents);
            let starts = [16, 144];
            let halfWalker = this.walkerSize / 2;
            let [leftWalker, rightWalker] = this.walk(world, [
                {start: [starts[0], this.freeRowY], directions: [GameConst.RIGHT]},
                {start: [starts[1], this.freeRowY], directions: [GameConst.LEFT]}
            ]);
            this.assert.deepStrictEqual(
                [
                    leftWalker.position[0] + halfWalker <= rightWalker.position[0] - halfWalker,
                    leftWalker.position[0] - starts[0],
                    [leftWalker.position[1], rightWalker.position[1]],
                    leftWalker.velocity,
                    rightWalker.velocity
                ],
                [true, starts[1] - rightWalker.position[0], [this.freeRowY, this.freeRowY], [0, 0], [0, 0]],
                'Both players stopped beside each other at the same distance: '+sc.toJsonString([leftWalker, rightWalker])
            );
            this.assert.deepStrictEqual(emittedEvents, ['reldens.playerHitPlayer', 'reldens.playerHitPlayerEnd']);
        });
    }

    async testAPointerPathIntoAStandingPlayerNeverCrossesIt()
    {
        await this.test('a pointer path through the tile of a standing player never crosses it and both end stopped', async () => {
            let emittedEvents = [];
            let world = await this.createWorldWithCollisions(emittedEvents);
            let halfWalker = this.walkerSize / 2;
            let [walker, standing] = this.walk(world, [
                {start: [16, this.freeRowY], directions: [], pointTo: {column: 5, row: this.freeRow}},
                {start: [80, this.freeRowY], directions: []}
            ]);
            this.assert.deepStrictEqual(
                [
                    walker.position[0] + halfWalker <= standing.position[0] - halfWalker,
                    [walker.position[1], standing.position[1]],
                    walker.velocity,
                    standing.velocity
                ],
                [true, [this.freeRowY, this.freeRowY], [0, 0], [0, 0]],
                'The walker never crossed the standing player and both stopped: '+sc.toJsonString([walker, standing])
            );
            this.assert.ok(-1 !== emittedEvents.indexOf('reldens.playerHitPlayerEnd'), 'The players contact ended');
        });
    }

    async testABlockedDiagonalStepRestartsItsPathFromTheSameStepAndArrives()
    {
        await this.test('a diagonal step blocked by a wall corner restarts the path from the same step and arrives', async () => {
            let world = await this.createWorldWithCollisions([]);
            world.allowSimultaneous = true;
            let target = {column: 4, row: this.freeRow};
            let body = this.createWalker(world, {start: [80, this.freeRowY], directions: [], pointTo: target}, 0);
            let restarts = [];
            let findPath = body.findAutoMovingPath.bind(body);
            body.findAutoMovingPath = (from, to) => {
                restarts.push([from, to]);
                return findPath(from, to);
            };
            body.position[0] = 48;
            body.position[1] = 112;
            body.updateCurrentPoints();
            this.stepWorld(world);
            let arrivedTile = [body.currentCol, body.currentRow];
            let arrived = this.removeWalker(world, body);
            this.assert.ok(0 < restarts.length, 'The blocked diagonal step restarted the path');
            this.assert.deepStrictEqual(
                [restarts, arrivedTile, arrived.velocity, body.autoMoving],
                [restarts.map(() => [[2, this.freeRow], [target.column, target.row]]), [target.column, target.row], [0, 0], false],
                'Every restart starts on the blocked step and the player arrives: '+sc.toJsonString([restarts, arrived])
            );
        });
    }

    async testAPointerPathIntoADynamicEnemyPushesItAndStartsTheBattle()
    {
        await this.test('a pointer path into a dynamic enemy pushes it without crossing it and starts one battle', async () => {
            let enemy = EnemyObjectBuilder.createEnemy({});
            let startedBattles = [];
            enemy.battle.startBattleWith = async (playerSchema) => startedBattles.push(playerSchema.sessionId);
            let world = await this.createWorldWithCollisions([], {
                config: {get: (path, defaultValue) => defaultValue},
                playerBySessionIdFromState: (sessionId) => ({sessionId})
            });
            let enemyStartX = 112;
            await world.createWorldObject(enemy, 'ground'+(this.freeRow * 6 + 3), 32, 32, enemyStartX, this.freeRowY);
            let [walker] = this.walk(world, [
                {start: [16, this.freeRowY], directions: [], pointTo: {column: 5, row: this.freeRow}}
            ]);
            let enemyPosition = enemy.objectBody.position;
            this.assert.deepStrictEqual(
                [
                    enemy.objectBody.type,
                    enemyStartX < enemyPosition[0],
                    walker.position[0] < enemyPosition[0],
                    [walker.position[1], Math.round(enemyPosition[1])],
                    startedBattles
                ],
                [Body.DYNAMIC, true, true, [this.freeRowY, this.freeRowY], ['walker-0']],
                'The enemy was pushed, never crossed and the battle started once: '+sc.toJsonString([walker, enemyPosition])
            );
        });
    }

    async testAPointerPathIntoAMovingObjectNeverCrossesItAndRunsTheHit()
    {
        await this.test('a pointer path into an object walking toward the player never crosses it and runs its hit', async () => {
            let emittedEvents = [];
            let world = await this.createWorldWithCollisions(emittedEvents);
            let hits = [];
            let roomObject = await world.createWorldObject(
                {hasState: true, onHit: (props) => hits.push(props.bodyA.playerId)},
                'ground'+(this.freeRow * 6 + 5),
                32,
                32,
                176,
                this.freeRowY
            );
            roomObject.objectBody.moveToPoint({column: 0, row: this.freeRow});
            let [walker] = this.walk(world, [
                {start: [16, this.freeRowY], directions: [], pointTo: {column: 5, row: this.freeRow}}
            ]);
            let objectPosition = roomObject.objectBody.position;
            this.assert.deepStrictEqual(
                [walker.position[0] < objectPosition[0], [walker.position[1], Math.round(objectPosition[1])], hits],
                [true, [this.freeRowY, this.freeRowY], ['walker-0']],
                'The walker never crossed the moving object: '+sc.toJsonString([walker, objectPosition])
            );
            this.assert.deepStrictEqual(
                emittedEvents.filter(eventName => -1 !== eventName.indexOf('PlayerHitObject')),
                ['reldens.startPlayerHitObjectBegin', 'reldens.endPlayerHitObjectBegin']
            );
        });
    }

}

module.exports.TestWorldPlayersCollisions = TestWorldPlayersCollisions;
