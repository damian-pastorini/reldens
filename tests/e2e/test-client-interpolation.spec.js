/**
 *
 * Reldens - Test Client Interpolation
 *
 * Tests the client scene interpolation (SceneDynamic) frame by frame on the real movements: the own player walking and
 * stopping, the own player placed by the server without movement, another player walking and placed as the first
 * client sees it, a town object placed and walking back to its original tile, a bullet flying to its target and the
 * player walking in the room it entered through a change point. Every recorded frame must follow the interpolation of
 * its entry (the real Phaser Linear step with the configured speed while moving, the exact state position once
 * stopped), the walks must show intermediate positions, the placements must land in one frame and the client must
 * never throw.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ObjectsConst } = require('../../lib/objects/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientInterpolation
{

    static WALK_MS = 1500;
    static BULLET_SKILL_KEY = 'attackBullet';
    static BULLET_TILES_DISTANCES = [4, 3];
    static OTHER_PLAYER_TILES_DISTANCE = 2;
    static WALK_TILES_DISTANCES = [3, 2];
    static OBJECT_TILES_DISTANCES = [2, 1];

    static expectFrames(summary, pageErrors, label)
    {
        expect(
            summary.mismatches,
            'Every '+label+' frame must follow the interpolation of its entry: '+sc.toJsonString(summary.mismatches)
        ).toEqual([]);
        expect(pageErrors, 'The client must not throw while the '+label+' moves').toEqual([]);
    }

    static async placeNextToNpc(page, gameConfig, context, minimumTilesDistance)
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            context.roomName,
            context.npcKey,
            context.navTimeout,
            minimumTilesDistance
        );
        expect(placement.reached, 'The player sprite must reach the placement: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

    static async runOwnPlayerWalkTest(page, screenshots, gameConfig, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        await Navigation.walkInDirection(page, 'ArrowRight', TestClientInterpolation.WALK_MS);
        let result = await InterpolationFramesRecorder.stopOnPlayerState(page, sessionId, false, context.navTimeout);
        await screenshots.capture(page, 'own-player-after-walk');
        expect(result.isOnState, 'The stopped player sprite must end on its server position').toBe(true);
        TestClientInterpolation.expectFrames(result.summary, pageErrors, 'own player');
        expect(result.summary.partialMoving, 'The walking sprite must step toward its moving state').toBeGreaterThan(0);
        expect(result.summary.placed, 'The stopped state must place the sprite on the server position')
            .toBeGreaterThan(0);
    }

    static async runOwnPlayerPlacementTest(page, screenshots, gameConfig, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        let placement = await TestClientInterpolation.placeNextToNpc(page, gameConfig, context, 0);
        let result = await InterpolationFramesRecorder.stopOnPlayerState(
            page,
            sessionId,
            placement.position,
            context.navTimeout
        );
        await screenshots.capture(page, 'own-player-placed');
        expect(result.isOnState, 'The placed player sprite must end on its server position').toBe(true);
        TestClientInterpolation.expectFrames(result.summary, pageErrors, 'placed player');
        expect(result.summary.moving, 'A placement without movement must never step the sprite').toBe(0);
        expect(result.summary.longestPlacedJump, 'The placement must move the sprite more than one tile in one frame')
            .toBeGreaterThan(Navigation.TILE_SIZE);
    }

    static async runOtherPlayerTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let otherPageErrors = InterpolationFramesRecorder.trackPageErrors(secondPage);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun);
        await Phaser.waitForPlayerInRoomState(secondPage, TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun));
        let otherSessionId = await secondPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await Phaser.waitForPlayerBySessionId(page, otherSessionId, context.navTimeout);
        await TestClientInterpolation.placeNextToNpc(page, gameConfig, context, 0);
        await InterpolationFramesRecorder.start(page, {players: [otherSessionId]});
        await Navigation.walkInDirection(secondPage, 'ArrowRight', TestClientInterpolation.WALK_MS);
        let isOwnWalkShown = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            secondPage,
            otherSessionId,
            false,
            context.navTimeout
        );
        expect(
            isOwnWalkShown,
            'The second client must show its player stopped on its server position: '
                +sc.toJsonString(await InterpolationFramesRecorder.readPlayerPositions(secondPage, otherSessionId))
        ).toBe(true);
        let isWalkShown = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            page,
            otherSessionId,
            await Phaser.getPlayerServerPosition(secondPage),
            context.navTimeout
        );
        expect(
            isWalkShown,
            'The first client must show the other player stopped on its server position: '
                +sc.toJsonString(await InterpolationFramesRecorder.readPlayerPositions(page, otherSessionId))
        ).toBe(true);
        let placement = await TestClientInterpolation.placeNextToNpc(
            secondPage,
            gameConfig,
            context,
            TestClientInterpolation.OTHER_PLAYER_TILES_DISTANCE
        );
        let result = await InterpolationFramesRecorder.stopOnPlayerState(
            page,
            otherSessionId,
            placement.position,
            context.navTimeout
        );
        await screenshots.capture(page, 'other-player-placed');
        expect(
            result.isOnState,
            'The first client must show the other player on its placement '+sc.toJsonString(placement.position)+': '
                +sc.toJsonString(await InterpolationFramesRecorder.readPlayerPositions(page, otherSessionId))
        ).toBe(true);
        TestClientInterpolation.expectFrames(result.summary, pageErrors, 'other player');
        expect(otherPageErrors, 'The other client must not throw while its player moves').toEqual([]);
        expect(result.summary.partialMoving, 'The other player sprite must step toward its moving state')
            .toBeGreaterThan(0);
        expect(result.summary.longestPlacedJump, 'The other player placement must move its sprite in one frame')
            .toBeGreaterThan(Navigation.TILE_SIZE);
    }

    static async runObjectTest(page, screenshots, gameConfig, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let npc = await context.fetchNpc();
        expect(npc, 'The e2eNpcKey object must be in the town room').toBeTruthy();
        let origin = [npc.originalCol, npc.originalRow];
        expect(
            await InterpolationFramesRecorder.waitForObjectOnBody(page, context.npcKey, false, context.navTimeout),
            'The NPC animation must be on its stopped body before the recording'
        ).toBe(true);
        let startTile = WalkableTileLocator.findWalkableTilesAlongDirections(
            await context.fetchTiles(origin, npc.maxTiles + 1),
            origin,
            TestClientInterpolation.OBJECT_TILES_DISTANCES
        ).shift();
        expect(startTile, 'A walkable tile must exist next to the object original tile').toBeTruthy();
        await InterpolationFramesRecorder.start(page, {objects: [context.npcKey]});
        let placedNpc = await RoomMovementApi.placeObject(gameConfig, context.roomName, context.npcKey, startTile);
        let isPlacementShown = await InterpolationFramesRecorder.waitForObjectOnBody(
            page,
            context.npcKey,
            {x: placedNpc.x, y: placedNpc.y},
            context.navTimeout
        );
        await RoomMovementApi.moveObjectToOriginalTile(gameConfig, context.roomName, context.npcKey, false);
        let movement = await RoomMovementApi.collectTrail(
            context.fetchNpc,
            (snapshot) => context.isStill(snapshot) && origin[0] === snapshot.currentCol && origin[1] === snapshot.currentRow,
            context.navTimeout
        );
        let isWalkShown = await InterpolationFramesRecorder.waitForObjectOnBody(page, context.npcKey, false, context.navTimeout);
        let summary = InterpolationFramesRecorder.summarize(await InterpolationFramesRecorder.stop(page), 'object');
        await screenshots.capture(page, 'object-walked-back');
        expect(isPlacementShown, 'The object sprite must land on its placement').toBe(true);
        expect(movement.done, 'The object must walk back to its original tile: '+sc.toJsonString(movement.last)).toBe(true);
        expect(isWalkShown, 'The stopped object sprite must end on its body position').toBe(true);
        TestClientInterpolation.expectFrames(summary, pageErrors, 'object');
        expect(summary.longestPlacedJump, 'The object placement must move its sprite in one frame')
            .toBeGreaterThanOrEqual(Navigation.TILE_SIZE);
        expect(summary.partialMoving, 'The walking object sprite must step toward its moving body').toBeGreaterThan(0);
    }

    static async runBulletTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let enemy = (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).find(
            snapshot => ObjectsConst.TYPE_ENEMY === snapshot.type
                && GameConst.STATUS.ACTIVE === snapshot.inState
                && !snapshot.isAggressive
        );
        expect(enemy, 'The forest must have an active passive enemy').toBeTruthy();
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, false, enemy.bodyKey);
        let placement = await RoomObjectsApi.placePlayerInLineOfObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemy.key,
            forestData.sceneTimeout,
            TestClientInterpolation.BULLET_TILES_DISTANCES
        );
        expect(
            placement.reached,
            'The player must be placed on a clear line of tiles from the enemy: '+sc.toJsonString(placement)
        ).toBe(true);
        let isTargeted = await RoomObjectsApi.targetBodyAtPosition(
            page,
            placement.bodyKey,
            placement.objectPosition,
            forestData.sceneTimeout
        );
        expect(isTargeted, 'The enemy must be targeted').toBe(true);
        await InterpolationFramesRecorder.start(page, {bullets: true});
        await page.click(Selectors.combat.skillButton(TestClientInterpolation.BULLET_SKILL_KEY), {force: true});
        let isFlightEnded = await InterpolationFramesRecorder.waitForBulletsFlightEnd(
            page,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        );
        let summary = InterpolationFramesRecorder.summarize(await InterpolationFramesRecorder.stop(page), 'bullet');
        await screenshots.capture(page, 'bullet-flight-ended');
        expect(isFlightEnded, 'A bullet must fly and end').toBe(true);
        TestClientInterpolation.expectFrames(summary, pageErrors, 'bullet');
        expect(summary.partialMoving, 'The bullet sprite must step toward its flying body').toBeGreaterThan(0);
    }

    static async walkIntoTheForest(page, context, longRun)
    {
        let townMovement = await MovementScenario.movePlayer(
            page,
            context,
            [
                Math.floor(Login.FOREST_TRANSITION_X / Navigation.TILE_SIZE),
                Math.floor(Login.FOREST_TRANSITION_Y / Navigation.TILE_SIZE) + 1
            ],
            TimeConstants.forLongRun(TimeConstants.MAP_CROSSING, longRun)
        );
        expect(townMovement.done, 'The player must reach the tile below the forest change point').toBe(true);
        let isInForest = await Navigation.ensureInRoom(
            page,
            Login.FOREST_ROOM_NAME,
            Login.FOREST_TRANSITION_X,
            Login.FOREST_TRANSITION_Y,
            context.navTimeout
        );
        expect(isInForest, 'The player must walk into the forest').toBe(true);
        await Phaser.waitForPlayerInRoomState(page, TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun));
        return await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
    }

    static async runSceneChangeTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        let sessionId = await TestClientInterpolation.walkIntoTheForest(page, context, longRun);
        let isArrivalShown = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            page,
            sessionId,
            false,
            context.navTimeout
        );
        expect(isArrivalShown, 'The new scene must show the player sprite on its server position').toBe(true);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME);
        let forestContext = {
            fetchPlayer: async () => RoomMovementApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, context.playerName),
            isStill: context.isStill
        };
        let targetTile = await RoomMovementApi.fetchClearLineTile(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            context.playerName,
            TestClientInterpolation.WALK_TILES_DISTANCES
        );
        expect(
            targetTile,
            'A clear line of forest tiles must start on the arrival point: '
                +sc.toJsonString(await forestContext.fetchPlayer())
        ).toBeTruthy();
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        let forestMovement = await MovementScenario.movePlayer(page, forestContext, targetTile, context.navTimeout);
        let result = await InterpolationFramesRecorder.stopOnPlayerState(page, sessionId, false, context.navTimeout);
        await screenshots.capture(page, 'player-walked-in-the-forest');
        expect(
            forestMovement.done,
            'The player must walk in the forest to '+targetTile.join(',')+': '+sc.toJsonString(forestMovement.last)
        ).toBe(true);
        expect(result.isOnState, 'The stopped player sprite must end on its server position').toBe(true);
        TestClientInterpolation.expectFrames(result.summary, pageErrors, 'player in the new scene');
        expect(result.summary.partialMoving, 'The player sprite must step toward its moving state').toBeGreaterThan(0);
        expect(result.summary.placed, 'The stopped state must place the sprite on the server position')
            .toBeGreaterThan(0);
    }

    static run()
    {
        test.describe('Client Interpolation', () => {
            test('own player sprite follows the walking state frame by frame and stops on the server position', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestClientInterpolation.runOwnPlayerWalkTest(page, screenshots, gameConfig, longRun);
            });
            test('own player sprite lands on a server placement in one frame without stepping', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestClientInterpolation.runOwnPlayerPlacementTest(page, screenshots, gameConfig, longRun);
            });
            test('other player sprite follows the other client walk and lands on its server placement', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestClientInterpolation.runOtherPlayerTest(page, secondPage, screenshots, gameConfig, longRun);
            });
            test('object sprite lands on its server placement and follows its walk back to the original tile', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestClientInterpolation.runObjectTest(page, screenshots, gameConfig, longRun);
            });
            test('bullet sprite follows its flying body frame by frame', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestClientInterpolation.runBulletTest(page, screenshots, gameConfig, longRun);
            });
            test('player sprite starts on its state after a scene change and follows its walk in the new room', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestClientInterpolation.runSceneChangeTest(page, screenshots, gameConfig, longRun);
            });
        });
    }
}

TestClientInterpolation.run();
