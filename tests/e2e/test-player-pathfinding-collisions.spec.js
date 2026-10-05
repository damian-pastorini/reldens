/**
 *
 * Reldens - Test Player Pathfinding And Collisions
 *
 * Tests the player movement on the real town tiles read from the server path finder grid: the pointer moves to
 * walkable tiles in every direction and distance, the pointer moves to walls, change points and the other blocked
 * tiles, the pointer moves across a blocked tile that must go around it, the direction movement against a wall, the
 * direction input that cancels a pointer path, the pointer path that runs into an object body and two players that
 * walk into each other. Every case asserts the server player body: the tile it ends on, the path it follows, its
 * velocity and every tile it crossed.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { MovementScenario } = require('./helpers/movement-scenario');
const { PlayerMovementCases } = require('./helpers/player-movement-cases');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestPlayerPathfindingCollisions
{

    static CANCEL_WALK_MS = 300;
    static MAX_CASE_ATTEMPTS = 6;
    static REQUIRED_CASES = 2;
    static BLOCKED_TARGETS_PER_KIND = 2;
    static MIN_PLAYERS_DISTANCE = 20;
    static CANCEL_TARGET_OFFSET = [6, 0];
    static POINTER_CASES = [
        {name: 'three tiles right', offset: [3, 0]},
        {name: 'three tiles left', offset: [-3, 0]},
        {name: 'three tiles down', offset: [0, 3]},
        {name: 'three tiles up', offset: [0, -3]},
        {name: 'one tile right', offset: [1, 0]},
        {name: 'two tiles diagonal down right', offset: [2, 2]},
        {name: 'two tiles diagonal up left', offset: [-2, -2]},
        {name: 'one tile diagonal up right', offset: [1, -1]},
        {name: 'far diagonal', offset: [6, -4]}
    ];

    static async startTest(page, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let player = await context.fetchPlayer();
        expect(player, 'The player body must be in the town room').toBeTruthy();
        context.from = [player.currentCol, player.currentRow];
        context.tiles = await context.fetchTiles(context.from, MovementScenario.TILES_RADIUS);
        expect(context.tiles.walkable.length, 'The town must have walkable tiles around the player').toBeGreaterThan(0);
        return context;
    }

    static async runPointerWalkableTest(page, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        let failures = await MovementScenario.collectFailures(
            TestPlayerPathfindingCollisions.POINTER_CASES,
            async (pointerCase) => PlayerMovementCases.runPointerWalkableCase(page, context, pointerCase)
        );
        await screenshots.capture(page, 'pointer-walkable-targets-done');
        expect(failures, 'Every pointer move to a walkable tile must end on it without crossing blocked tiles').toEqual([]);
    }

    static async runPointerBlockedTest(page, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        let blockedTargets = [];
        for(let kind of WalkableTileLocator.BLOCKED_KINDS){
            let closestTiles = WalkableTileLocator.findClosestTiles(
                context.tiles[kind],
                context.from,
                TestPlayerPathfindingCollisions.BLOCKED_TARGETS_PER_KIND
            );
            blockedTargets.push(...closestTiles.map(tile => ({kind, tile})));
        }
        expect(blockedTargets.length, 'The town must have blocked tiles around the player').toBeGreaterThan(0);
        let failures = await MovementScenario.collectFailures(
            blockedTargets,
            async (blockedTarget) => PlayerMovementCases.runPointerBlockedCase(page, context, blockedTarget)
        );
        await screenshots.capture(page, 'pointer-blocked-targets-done');
        expect(failures, 'A pointer move to a blocked tile must never leave the player on a blocked tile').toEqual([]);
    }

    static async runPointerCrossingTest(page, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        let crossings = WalkableTileLocator.findDirectionCases(
            [...context.tiles.walls, ...context.tiles.otherBlocked],
            context.tiles.walkable,
            context.from,
            WalkableTileLocator.mapCrossingCase
        );
        expect(crossings.length, 'The town must have a blocked tile with walkable tiles on both sides').toBeGreaterThan(0);
        let results = await MovementScenario.runReachableCases(
            crossings,
            TestPlayerPathfindingCollisions.MAX_CASE_ATTEMPTS,
            TestPlayerPathfindingCollisions.REQUIRED_CASES,
            async (crossing) => PlayerMovementCases.runCrossingCase(page, context, crossing)
        );
        await screenshots.capture(page, 'pointer-crossings-done');
        expect(results.checkedCases, 'At least one crossing over a blocked tile must be reachable').toBeGreaterThan(0);
        expect(results.failures, 'A pointer move across a blocked tile must go around it and reach the target').toEqual([]);
    }

    static async runWallApproachTest(page, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        let approaches = WalkableTileLocator.findDirectionCases(
            context.tiles.walls,
            context.tiles.walkable,
            context.from,
            (start, wall, direction) => ({start, wall, direction})
        );
        expect(approaches.length, 'The town must have a wall with a walkable tile next to it').toBeGreaterThan(0);
        let results = await MovementScenario.runReachableCases(
            approaches,
            TestPlayerPathfindingCollisions.MAX_CASE_ATTEMPTS,
            TestPlayerPathfindingCollisions.REQUIRED_CASES,
            async (approach) => PlayerMovementCases.runWallApproachCase(page, context, approach)
        );
        await screenshots.capture(page, 'direction-against-walls-done');
        expect(results.checkedCases, 'At least one wall approach must be reachable').toBeGreaterThan(0);
        expect(results.failures, 'Walking against a wall must stop the player before the wall tile').toEqual([]);
    }

    static async runDirectionCancelsPathTest(page, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        let offset = TestPlayerPathfindingCollisions.CANCEL_TARGET_OFFSET;
        let target = WalkableTileLocator.findWalkableNearOffset(context.tiles, context.from, offset)
            || WalkableTileLocator.findWalkableNearOffset(context.tiles, context.from, [-offset[0], -offset[1]]);
        expect(target, 'The town must have a walkable tile six tiles away from the player').toBeTruthy();
        let point = WalkableTileLocator.worldPoint(target);
        await Navigation.moveToWorldPoint(page, point.x, point.y);
        let started = await RoomMovementApi.collectTrail(
            context.fetchPlayer,
            (player) => 0 < player.pathSteps,
            MovementScenario.SETTLE_MS
        );
        expect(started.done, 'The pointer move must start a path').toBe(true);
        await Navigation.walkInDirection(page, 'ArrowDown', TestPlayerPathfindingCollisions.CANCEL_WALK_MS);
        let stopped = await RoomMovementApi.collectTrail(context.fetchPlayer, context.isStill, context.navTimeout);
        await screenshots.capture(page, 'direction-cancels-path');
        expect(stopped.done, 'The player must stand still after the direction input and the stop').toBe(true);
        expect(stopped.last.pathSteps, 'The direction input must drop the pointer path').toBe(0);
        expect(
            [stopped.last.currentCol, stopped.last.currentRow],
            'The player must not keep walking to the pointer target'
        ).not.toEqual(target);
    }

    static async runObjectBodyTest(page, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        expect(context.npcKey, 'e2eNpcKey must be configured').toBeTruthy();
        let npc = await RoomMovementApi.switchRandomMovement(gameConfig, context.roomName, context.npcKey, false);
        expect(npc, 'The e2eNpcKey object must be in the town room').toBeTruthy();
        let origin = [npc.originalCol, npc.originalRow];
        try {
            await RoomMovementApi.placeObject(gameConfig, context.roomName, context.npcKey, origin);
            context.objectTiles = await context.fetchTiles(origin, MovementScenario.TILES_RADIUS);
            let objectCases = WalkableTileLocator.findDirectionCases(
                [origin],
                context.objectTiles.walkable,
                origin,
                WalkableTileLocator.mapLineAcrossCase
            );
            expect(objectCases.length, 'The object must have walkable tiles on both sides').toBeGreaterThan(0);
            let results = await MovementScenario.runReachableCases(
                objectCases,
                objectCases.length,
                1,
                async (objectCase) => PlayerMovementCases.runObjectBodyCase(page, context, objectCase)
            );
            await screenshots.capture(page, 'pointer-path-into-object-done');
            expect(results.checkedCases, 'At least one line across the object must be reachable').toBeGreaterThan(0);
            expect(results.failures, 'A pointer path into an object body must never cross the object').toEqual([]);
        } finally {
            await RoomMovementApi.placeObject(gameConfig, context.roomName, context.npcKey, origin);
            await RoomMovementApi.switchRandomMovement(gameConfig, context.roomName, context.npcKey, true);
        }
    }

    static async loginSecondPlayer(secondPage, gameConfig, longRun, roomName)
    {
        let secondPlayerName = gameConfig.e2ePlayerName3 || 'ImRoot3';
        await Login.loginAndStartGame(
            secondPage,
            gameConfig.e2eUsername3 || 'root3',
            gameConfig.e2ePassword3 || 'root',
            secondPlayerName,
            longRun
        );
        await Navigation.waitForRoom(secondPage, roomName, TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun));
        return secondPlayerName;
    }

    static async runPlayersCollisionTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let context = await TestPlayerPathfindingCollisions.startTest(page, gameConfig, longRun);
        let secondPlayerName = await TestPlayerPathfindingCollisions.loginSecondPlayer(
            secondPage,
            gameConfig,
            longRun,
            context.roomName
        );
        let placement = await RoomObjectsApi.placePlayerNearPlayer(
            gameConfig,
            context.roomName,
            secondPlayerName,
            context.playerName
        );
        expect(placement.error, 'The second player must be placed next to the first one').toBeUndefined();
        let fetchPlayers = async () => ({
            first: await context.fetchPlayer(),
            second: await RoomMovementApi.fetchPlayer(gameConfig, context.roomName, secondPlayerName)
        });
        let before = await fetchPlayers();
        let deltaX = before.second.x - before.first.x;
        let deltaY = before.second.y - before.first.y;
        let isHorizontal = Math.abs(deltaX) >= Math.abs(deltaY);
        let arrowKey = isHorizontal ? (0 < deltaX ? 'ArrowRight' : 'ArrowLeft') : (0 < deltaY ? 'ArrowDown' : 'ArrowUp');
        await Navigation.walkInDirection(page, arrowKey, PlayerMovementCases.WALK_MS);
        let settled = await RoomMovementApi.collectTrail(
            fetchPlayers,
            (players) => context.isStill(players.first) && context.isStill(players.second),
            context.navTimeout
        );
        await screenshots.capture(page, 'players-collision-done');
        expect(settled.done, 'Both players must stand still after the collision').toBe(true);
        let after = settled.last;
        expect(
            Math.hypot(after.second.x - after.first.x, after.second.y - after.first.y),
            'The players bodies must not overlap after walking into each other'
        ).toBeGreaterThanOrEqual(TestPlayerPathfindingCollisions.MIN_PLAYERS_DISTANCE);
        let deltaAfter = isHorizontal ? after.second.x - after.first.x : after.second.y - after.first.y;
        expect(
            Math.sign(deltaAfter),
            'The walking player must not pass through the other player'
        ).toBe(Math.sign(isHorizontal ? deltaX : deltaY));
    }

    static run()
    {
        test.describe('Player Pathfinding And Collisions', () => {
            test('pointer moves to walkable tiles end on the selected tile in every direction and distance', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runPointerWalkableTest(page, screenshots, gameConfig, longRun);
            });
            test('pointer moves to walls, change points and blocked tiles never leave the player on a blocked tile', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runPointerBlockedTest(page, screenshots, gameConfig, longRun);
            });
            test('pointer moves across a blocked tile go around it and reach the target', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runPointerCrossingTest(page, screenshots, gameConfig, longRun);
            });
            test('direction movement against a wall stops the player before the wall tile', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runWallApproachTest(page, screenshots, gameConfig, longRun);
            });
            test('direction input cancels the pointer path', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runDirectionCancelsPathTest(page, screenshots, gameConfig, longRun);
            });
            test('pointer path into an object body never crosses the object or a blocked tile', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runObjectBodyTest(page, screenshots, gameConfig, longRun);
            });
            test('two players walking into each other stop without overlapping or passing through', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestPlayerPathfindingCollisions.runPlayersCollisionTest(page, secondPage, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestPlayerPathfindingCollisions.run();
