/**
 *
 * Reldens - Test Client Interpolation
 *
 * Tests the client scene interpolation (SceneDynamic) frame by frame on the real movements: the own player walking and
 * stopping, the own player placed by the server without movement, another player walking and placed as the first
 * client sees it, a town object placed and walking back to its original tile, a bullet flying to its target (rendering
 * its texture) and the player walking in the room it entered through a change point. Every recorded frame must follow
 * the interpolation of its entry (the real Phaser Linear step with the configured speed while moving, the exact state
 * position once stopped), the walks must show intermediate positions, the placements must land in one frame and the
 * client must never throw. The long run only steps that show each movement on screen are in
 * ClientInterpolationShowcase and ClientInterpolationBulletShowcase.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { MovementScenario } = require('./helpers/movement-scenario');
const { ClientInterpolationShowcase } = require('./helpers/client-interpolation-showcase');
const { ClientInterpolationBulletShowcase } = require('./helpers/client-interpolation-bullet-showcase');
const { ObjectInterpolationSteps } = require('./helpers/object-interpolation-steps');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientInterpolation
{

    static WALK_MS = 1500;
    static BULLET_SKILL_KEY = 'attackBullet';
    static BULLET_TEXTURE_KEY = 'default_bullet';
    static BULLET_TILES_DISTANCES = [4, 3];
    static OTHER_PLAYER_TILES_DISTANCE = 2;
    static WALK_TILES_DISTANCES = [3, 2];

    static expectFrames(summary, pageErrors, label)
    {
        expect(
            summary.mismatches,
            'Every '+label+' frame must follow the interpolation of its entry: '+sc.toJsonString(summary.mismatches)
        ).toEqual([]);
        expect(pageErrors, 'The client must not throw while the '+label+' moves').toEqual([]);
    }

    static async runOwnPlayerWalkTest(page, screenshots, gameConfig, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        await ClientInterpolationShowcase.prepareOwnWalk(page, context, longRun);
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        await ClientInterpolationShowcase.walkOwnPlayer(page, TestClientInterpolation.WALK_MS, longRun);
        let result = await InterpolationFramesRecorder.stopOnPlayerState(page, sessionId, false, context.navTimeout);
        await ClientInterpolationShowcase.showWalkResult(page, 'The player stopped', result.summary, longRun);
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
        let context = await ClientInterpolationShowcase.startWithPlacementAnchor(page, gameConfig, longRun);
        let sessionId = await page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await ClientInterpolationShowcase.prepareOwnPlacement(page, context, longRun);
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        let placement = await ClientInterpolationShowcase.placeOwnPlayer(page, context, longRun);
        let result = await InterpolationFramesRecorder.stopOnPlayerState(
            page,
            sessionId,
            placement.position,
            context.navTimeout
        );
        await ClientInterpolationShowcase.showPlacementResult(page, result.summary, longRun);
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
        let context = await ClientInterpolationShowcase.startWithPlacementAnchor(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun);
        await Phaser.waitForPlayerInRoomState(secondPage, TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun));
        let otherSessionId = await secondPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await Phaser.waitForPlayerBySessionId(page, otherSessionId, context.navTimeout);
        await ClientInterpolationShowcase.placeOwnPlayer(page, context, longRun);
        await ClientInterpolationShowcase.startBothClientsRecording(
            page,
            secondPage,
            context,
            gameConfig.e2ePlayerName,
            longRun
        );
        await InterpolationFramesRecorder.start(page, {players: [otherSessionId]});
        let walkedPlayer = await MovementScenario.walkClearLine(
            secondPage,
            context,
            context.roomName,
            gameConfig.e2ePlayerName,
            longRun ? ClientInterpolationShowcase.WALK_TILES_DISTANCES : TestClientInterpolation.WALK_TILES_DISTANCES
        );
        let isOwnWalkShown = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            secondPage,
            otherSessionId,
            walkedPlayer,
            context.navTimeout
        );
        expect(
            isOwnWalkShown,
            'The second client must show its player stopped on its server position '+sc.toJsonString(walkedPlayer)
                +': '+sc.toJsonString(await InterpolationFramesRecorder.readPlayerPositions(secondPage, otherSessionId))
        ).toBe(true);
        let isWalkShown = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            page,
            otherSessionId,
            walkedPlayer,
            context.navTimeout
        );
        expect(
            isWalkShown,
            'The first client must show the other player stopped on its server position '+sc.toJsonString(walkedPlayer)
                +': '+sc.toJsonString(await InterpolationFramesRecorder.readPlayerPositions(page, otherSessionId))
        ).toBe(true);
        await ClientInterpolationShowcase.prepareOtherPlayerPlacement(page, secondPage, walkedPlayer, longRun);
        let placement = await MovementScenario.placePlayerNextToNpc(
            secondPage,
            context,
            longRun
                ? ClientInterpolationShowcase.OTHER_PLACEMENT_DISTANCE
                : TestClientInterpolation.OTHER_PLAYER_TILES_DISTANCE
        );
        let result = await InterpolationFramesRecorder.stopOnPlayerState(
            page,
            otherSessionId,
            placement.position,
            context.navTimeout
        );
        await ClientInterpolationShowcase.showOtherPlacementResult(page, secondPage, result.summary, longRun);
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
        expect(
            await InterpolationFramesRecorder.waitForObjectOnBody(page, context.npcKey, false, context.navTimeout),
            'The NPC animation must be on its stopped body before the recording'
        ).toBe(true);
        let recorded = await ObjectInterpolationSteps.recordPlacementAndWalkBack(page, page, context, npc, longRun);
        await ClientInterpolationShowcase.showWalkResult(page, 'The NPC is back on its tile', recorded.summary, longRun);
        await screenshots.capture(page, 'object-walked-back');
        ObjectInterpolationSteps.expectRecording(recorded, pageErrors);
    }

    static async runBulletTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let enemy = await ClientInterpolationBulletShowcase.findCentralEnemy(
            page,
            gameConfig,
            await MovementScenario.fetchPassiveEnemy(gameConfig, Login.FOREST_ROOM_NAME),
            longRun
        );
        await MovementScenario.stopMovingBodies(gameConfig, Login.FOREST_ROOM_NAME, enemy.bodyKey);
        await MovementScenario.placePlayerInLineAndTarget(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemy.key,
            forestData.sceneTimeout,
            longRun
                ? ClientInterpolationBulletShowcase.TILES_DISTANCES
                : TestClientInterpolation.BULLET_TILES_DISTANCES
        );
        await ClientInterpolationBulletShowcase.prepareFlight(
            page,
            gameConfig,
            TestClientInterpolation.BULLET_SKILL_KEY,
            enemy.bodyKey,
            longRun
        );
        let skillSelector = Selectors.combat.skillButton(TestClientInterpolation.BULLET_SKILL_KEY);
        await InterpolationFramesRecorder.start(page, {bullets: true});
        await ClientInterpolationBulletShowcase.hoverBeforeClick(page, skillSelector, longRun);
        await page.click(skillSelector, {force: true});
        let isFlightEnded = await InterpolationFramesRecorder.waitForBulletsFlightEnd(
            page,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        );
        let summary = InterpolationFramesRecorder.summarize(await InterpolationFramesRecorder.stop(page), 'bullet');
        await ClientInterpolationBulletShowcase.showResult(page, gameConfig, enemy.bodyKey, summary, longRun);
        await screenshots.capture(page, 'bullet-flight-ended');
        expect(isFlightEnded, 'A bullet must fly and end').toBe(true);
        TestClientInterpolation.expectFrames(summary, pageErrors, 'bullet');
        expect(summary.partialMoving, 'The bullet sprite must step toward its flying body').toBeGreaterThan(0);
        expect(summary.renderedTextures, 'The flying bullet sprite must be visible and render its texture')
            .toEqual([TestClientInterpolation.BULLET_TEXTURE_KEY]);
    }

    static async runSceneChangeTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        let context = await MovementScenario.start(page, gameConfig, longRun);
        await ClientInterpolationShowcase.prepareChangePointWalk(page, context, longRun);
        let sessionId = await ClientInterpolationShowcase.walkIntoTheForest(page, context, longRun);
        let isArrivalShown = await InterpolationFramesRecorder.waitForPlayerSpriteOnState(
            page,
            sessionId,
            false,
            context.navTimeout
        );
        expect(isArrivalShown, 'The new scene must show the player sprite on its server position').toBe(true);
        await MovementScenario.stopMovingBodies(gameConfig, Login.FOREST_ROOM_NAME);
        await ClientInterpolationShowcase.showForestArrival(page, context, sessionId, longRun);
        await InterpolationFramesRecorder.start(page, {players: [sessionId]});
        let walkedPlayer = await MovementScenario.walkClearLine(
            page,
            context,
            Login.FOREST_ROOM_NAME,
            context.playerName,
            longRun ? ClientInterpolationShowcase.FOREST_WALK_DISTANCES : TestClientInterpolation.WALK_TILES_DISTANCES
        );
        let result = await InterpolationFramesRecorder.stopOnPlayerState(
            page,
            sessionId,
            walkedPlayer,
            context.navTimeout
        );
        await ClientInterpolationShowcase.showWalkResult(page, 'The player stopped', result.summary, longRun);
        await screenshots.capture(page, 'player-walked-in-the-forest');
        expect(
            result.isOnState,
            'The stopped player sprite must end on its server position '+sc.toJsonString(walkedPlayer)
        ).toBe(true);
        TestClientInterpolation.expectFrames(result.summary, pageErrors, 'player in the new scene');
        expect(result.summary.partialMoving, 'The player sprite must step toward its moving state').toBeGreaterThan(0);
        expect(result.summary.placed, 'The stopped state must place the sprite on the server position')
            .toBeGreaterThan(0);
    }

    static run()
    {
        test.describe('Client Interpolation', () => {
            test.afterEach(async ({ gameConfig, e2eGroup, longRun }) => {
                await ClientInterpolationShowcase.restoreLiveChanges(gameConfig, e2eGroup, longRun);
            });
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
