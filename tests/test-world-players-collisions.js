/**
 *
 * Reldens - Test World Players Collisions
 *
 * Tests the players bodies contacts with the real P2world and the rooms collisions manager on the walls world of
 * WallsWorldBaseTest (the row 4 is free of walls): two players walking into each other at the same time stop both on
 * the contact, each one beside the other and at the same distance from its start, with one players contact begin and
 * end; and a pointer path through the tile of a standing player never crosses that player, ends its path on the players
 * contact end and pushes the standing player less than one walker size; and a pointer path into an object body walking its own
 * path toward the player never crosses that object, runs its hit on every contact begin (each one started and ended)
 * and, finding a path around the blocked step on the speed to next max retries, arrives stopped on its target (ISSUE
 * #341); and a pointer path into a real dynamic
 * enemy pushes the enemy without crossing it and starts one battle with the walking player (once the enemy is against
 * the world border the player keeps pushing it at the full speed, ISSUE #341, so its stop is not checked); and with the
 * simultaneous keys (the sample allowSimultaneousKeys) a player pushed one tile up and left of its path start, so its
 * next step is a diagonal over the column wall corner, restarts its path from the column it centered on (the body first
 * centers on the row of a horizontal step) on the speed to next max retries and arrives on its target centered on the
 * row (a retry is counted only while the body makes no progress); and a body 7 pixels below its row center (the offset
 * of a held direction key, ISSUE #453) on a horizontal path to the tile over the row 5 wall ends centered on the row on
 * that tile, stopped; and a body off its row center keeps its offset on the steps whose tile on the offset side is
 * walkable (no vertical move toward the free row 3) and walks to the row center only on the column before the step
 * beside the row 5 wall (ISSUE #459); and a player pushed off its row center by another player standing above it walks
 * to the next tile of the row keeping its offset, with no players contact and the standing player not moved (ISSUE
 * #459: the row center leg used to walk it into that player and the contact ended its path).
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
            let standingStartX = 80;
            let [walker, standing] = this.walk(world, [
                {start: [16, this.freeRowY], directions: [], pointTo: {column: 5, row: this.freeRow}},
                {start: [standingStartX, this.freeRowY], directions: []}
            ]);
            this.assert.deepStrictEqual(
                [
                    walker.position[0] + halfWalker <= standing.position[0] - halfWalker,
                    [walker.position[1], standing.position[1]],
                    walker.velocity,
                    standing.velocity,
                    standing.position[0] < standingStartX + this.walkerSize
                ],
                [true, [this.freeRowY, this.freeRowY], [0, 0], [0, 0], true],
                'The walker never crossed nor shoved the standing player and both stopped: '
                    +sc.toJsonString([walker, standing])
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
                [restarts, arrivedTile, arrived.velocity, body.autoMoving, arrived.position[1]],
                [
                    restarts.map(() => [[1, this.freeRow], [target.column, target.row]]),
                    [target.column, target.row],
                    [0, 0],
                    false,
                    this.freeRowY
                ],
                'Every restart starts on the column the body centered on and the player arrives centered on the row: '
                    +sc.toJsonString([restarts, arrived])
            );
        });
    }

    async testABodyOffItsRowCenterReachesTheTargetNextToAWallCorner()
    {
        await this.test('a body off its row center on a horizontal path ends centered on the row next to the wall corner', async () => {
            let world = await this.createWorldWithCollisions([]);
            let target = {column: 4, row: this.freeRow};
            let body = this.createWalker(world, {start: [16, this.freeRowY + 7], directions: [], pointTo: target}, 0);
            this.stepWorld(world);
            let arrivedTile = [body.currentCol, body.currentRow];
            let arrived = this.removeWalker(world, body);
            this.assert.deepStrictEqual(
                [arrivedTile, arrived.position[1], arrived.velocity, body.autoMoving],
                [[target.column, target.row], this.freeRowY, [0, 0], false],
                'The held key offset is removed and the body reaches the tile over the row 5 wall: '+sc.toJsonString(arrived)
            );
        });
    }

    walkRecordingSteps(world, walker)
    {
        let body = this.createWalker(world, walker, 0);
        let steps = [];
        this.stepWorld(world, () => steps.push([body.currentCol, Math.round(body.position[1])]));
        return Object.assign({arrivedTile: [body.currentCol, body.currentRow], steps}, this.removeWalker(world, body));
    }

    async testAnOffsetBodyCentersOnlyBeforeTheStepBesideAWall()
    {
        await this.test('a body off its row center keeps its offset beside walkable tiles and centers only before the step beside a wall', async () => {
            let upWalk = this.walkRecordingSteps(
                await this.createWorldWithCollisions([]),
                {start: [112, this.freeRowY - 7], directions: [], pointTo: {column: 5, row: this.freeRow}}
            );
            let downWalk = this.walkRecordingSteps(
                await this.createWorldWithCollisions([]),
                {start: [16, this.freeRowY + 7], directions: [], pointTo: {column: 4, row: this.freeRow}}
            );
            let centeredColumn = (walked, startY) => walked.steps.filter((step) => startY !== step[1]).map((step) => step[0]).slice(0, 1);
            this.assert.deepStrictEqual(
                [
                    upWalk.arrivedTile,
                    upWalk.position[1],
                    centeredColumn(upWalk, this.freeRowY - 7),
                    downWalk.arrivedTile,
                    downWalk.position[1],
                    centeredColumn(downWalk, this.freeRowY + 7)
                ],
                [[5, this.freeRow], this.freeRowY - 7, [], [4, this.freeRow], this.freeRowY, [2]],
                'The offset toward the free row 3 is kept and the offset toward the row 5 wall is removed only on the column'
                    +' before the wall: '+sc.toJsonString([upWalk, downWalk])
            );
        });
    }

    async testAPlayerOffItsRowCenterWalksBesideAnotherPlayerWithoutTouchingIt()
    {
        await this.test('a player pushed off its row center by another player walks to the free tile of the row without touching it', async () => {
            let emittedEvents = [];
            let world = await this.createWorldWithCollisions(emittedEvents);
            let standingStart = [16, this.freeRowY - 13];
            let [walker, standing] = this.walk(world, [
                {start: [16, this.freeRowY + 10], directions: [], pointTo: {column: 1, row: this.freeRow}},
                {start: standingStart, directions: []}
            ]);
            this.assert.deepStrictEqual(
                [
                    Math.floor(walker.position[0] / 32),
                    walker.position[1],
                    walker.velocity,
                    standing.position,
                    emittedEvents.filter((eventName) => -1 !== eventName.indexOf('playerHitPlayer'))
                ],
                [1, this.freeRowY + 10, [0, 0], standingStart, []],
                'The walker kept its offset away from the standing player and arrived: '+sc.toJsonString([walker, standing])
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

    async testAPointerPathIntoAMovingObjectGoesAroundItAndRunsTheHit()
    {
        await this.test('a pointer path into an object walking toward the player never crosses it, runs its hit and arrives', async () => {
            let emittedEvents = [];
            let world = await this.createWorldWithCollisions(emittedEvents);
            let hits = [];
            let target = {column: 5, row: this.freeRow};
            let roomObject = await world.createWorldObject(
                {hasState: true, onHit: (props) => hits.push(props.bodyA.playerId)},
                'ground'+(this.freeRow * 6 + 5),
                32,
                32,
                176,
                this.freeRowY
            );
            roomObject.objectBody.moveToPoint({column: 0, row: this.freeRow});
            let walked = this.walkTracked(
                world,
                {start: [16, this.freeRowY], directions: [], pointTo: target},
                roomObject.objectBody,
                this.aroundPathSteps
            );
            this.assert.deepStrictEqual(
                [
                    walked.crossedSteps,
                    0 < hits.length && hits.every(playerId => 'walker-0' === playerId),
                    walked.arrivedTile,
                    walked.velocity
                ],
                [[], true, [target.column, target.row], [0, 0]],
                'The walker never crossed the moving object, hit it and arrived: '+sc.toJsonString([walked, hits])
            );
            this.assert.deepStrictEqual(
                emittedEvents.filter(eventName => -1 !== eventName.indexOf('PlayerHitObject')),
                hits.flatMap(() => ['reldens.startPlayerHitObjectBegin', 'reldens.endPlayerHitObjectBegin'])
            );
        });
    }

}

module.exports.TestWorldPlayersCollisions = TestWorldPlayersCollisions;
