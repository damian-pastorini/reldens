/**
 *
 * Reldens - Test Client Interpolation Speed
 *
 * Tests the client/general/engine/interpolationSpeed option on the own player walk (exclusive group, the town moving
 * objects paused, the option set before the engine starts, InterpolationFramesRecorder on every frame): with the speed
 * 1 every moving frame lands the sprite on its state target, so no frame steps part of the way; with another value the
 * scene reads it and every moving frame steps the sprite with that value (the sample value is 0.4).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { MovementScenario } = require('./helpers/movement-scenario');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { Navigation } = require('./helpers/navigation');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientInterpolationSpeed
{

    static ENGINE_PATH = 'client/general/engine';
    static WALK_KEY = 'ArrowRight';
    static WALK_MS = 1500;
    static ONE_FRAME_SPEED = 1;
    static OTHER_SPEED = 0.25;

    static async recordOwnWalk(context, interpolationSpeed)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(context.page);
        await InitialClientConfig.overrideBeforeEngine(context.page, TestClientInterpolationSpeed.ENGINE_PATH, {
            interpolationSpeed
        });
        let walkContext = await MovementScenario.start(context.page, context.gameConfig, context.longRun);
        expect(
            await context.page.evaluate(() => window.reldens.getActiveScene().interpolationSpeed),
            'The scene reads the configured interpolation speed'
        ).toBe(interpolationSpeed);
        let sessionId = await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await InterpolationFramesRecorder.start(context.page, {players: [sessionId]});
        await Navigation.walkInDirection(context.page, TestClientInterpolationSpeed.WALK_KEY, TestClientInterpolationSpeed.WALK_MS);
        let result = await InterpolationFramesRecorder.stopOnPlayerState(context.page, sessionId, false, walkContext.navTimeout);
        expect(result.isOnState, 'The stopped player sprite ends on its server position').toBe(true);
        expect(
            result.summary.mismatches,
            'Every frame follows the interpolation with the configured speed: '+sc.toJsonString(result.summary.mismatches)
        ).toEqual([]);
        expect(pageErrors, 'The client never throws while the player walks').toEqual([]);
        expect(result.summary.moving, 'The walking state moves the sprite').toBeGreaterThan(0);
        return result.summary;
    }

    static async runOneFrameSpeedTest(context)
    {
        let summary = await TestClientInterpolationSpeed.recordOwnWalk(context, TestClientInterpolationSpeed.ONE_FRAME_SPEED);
        expect(summary.partialMoving, 'With the speed 1 every moving frame lands on its state target').toBe(0);
    }

    static async runOtherSpeedTest(context)
    {
        let summary = await TestClientInterpolationSpeed.recordOwnWalk(context, TestClientInterpolationSpeed.OTHER_SPEED);
        expect(summary.partialMoving, 'With another speed the moving frames step part of the way').toBeGreaterThan(0);
    }

    static run()
    {
        test.describe('Client Interpolation Speed', () => {
            test('the interpolation speed 1 lands the walking sprite on its state target in one frame', async ({ page, gameConfig, longRun }) => {
                await TestClientInterpolationSpeed.runOneFrameSpeedTest({page, gameConfig, longRun});
            });
            test('another configured interpolation speed steps the walking sprite with that value', async ({ page, gameConfig, longRun }) => {
                await TestClientInterpolationSpeed.runOtherSpeedTest({page, gameConfig, longRun});
            });
        });
    }

}

TestClientInterpolationSpeed.run();
