/**
 *
 * Reldens - Test Timing Objects Respawn
 *
 * Tests the respawn of a mined forest rock (TimingMiningSteps, the rock respawn time shortened for the group on the
 * live rock where the case waits for it): the miner logging back in within the respawn window still sees the mined
 * rock hidden and the server keeps it disabled; every player leaving after the mining and one joining after the
 * respawn time finds the rock active, colliding and shown; and every player leaving during the respawn with the forest
 * room disposed (its timers cleared) lets the next player create the room again with the rock active.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsRespawn
{

    static SHORT_RESPAWN_MS = 2000;

    static async mineAndLeave(context, respawnTime = 0)
    {
        let mining = await TimingMiningSteps.prepare(context, 0 < respawnTime ? {respawnTime} : {});
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The rock is mined');
        let minedRock = await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey);
        expect([minedRock.inState, minedRock.collides], 'The mined rock is disabled').toEqual([GameConst.STATUS.DISABLED, false]);
        await context.page.reload();
        return mining;
    }

    static async fetchClientRockVisible(page, rockKey)
    {
        return await page.evaluate(
            (objectKey) => Boolean(window.reldens.getActiveScene().objectsAnimations[objectKey]?.sceneSprite?.visible),
            rockKey
        );
    }

    static async expectActiveRock(context, mining)
    {
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let rockState = await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey);
        expect([rockState.inState, rockState.collides], 'The respawned rock is active and colliding')
            .toEqual([GameConst.STATUS.ACTIVE, true]);
        await expect.poll(
            async () => await TestTimingObjectsRespawn.fetchClientRockVisible(context.page, mining.rockKey),
            {message: 'The respawned rock is shown', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
    }

    static async runHiddenWithinWindowTest(context)
    {
        let mining = await TestTimingObjectsRespawn.mineAndLeave(context);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        expect(
            (await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey)).inState,
            'The server keeps the rock disabled within the respawn window'
        ).toBe(GameConst.STATUS.DISABLED);
        await context.page.waitForTimeout(TimeConstants.ACTION);
        expect(await TestTimingObjectsRespawn.fetchClientRockVisible(context.page, mining.rockKey), 'The rock stays hidden')
            .toBe(false);
    }

    static async runActiveAfterRespawnTest(context)
    {
        let mining = await TestTimingObjectsRespawn.mineAndLeave(context, TestTimingObjectsRespawn.SHORT_RESPAWN_MS);
        await context.page.waitForTimeout(TestTimingObjectsRespawn.SHORT_RESPAWN_MS + TimeConstants.ACTION);
        await TestTimingObjectsRespawn.expectActiveRock(context, mining);
    }

    static async runDisposedDuringRespawnTest(context)
    {
        let mining = await TestTimingObjectsRespawn.mineAndLeave(context, TestTimingObjectsRespawn.SHORT_RESPAWN_MS);
        let disposed = await GameplayE2eStateApi.disposeRoom(context.gameConfig, Login.FOREST_ROOM_NAME);
        expect(disposed.disposed, 'The empty forest room is disposed: '+disposed.error).toBe(Login.FOREST_ROOM_NAME);
        await context.page.waitForTimeout(TestTimingObjectsRespawn.SHORT_RESPAWN_MS + TimeConstants.ACTION);
        await TestTimingObjectsRespawn.expectActiveRock(context, mining);
    }

    static run()
    {
        test.describe('Timing Objects Respawn', () => {
            test('miner back within the respawn window still sees the rock hidden', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRespawn.runHiddenWithinWindowTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player joining after the respawn time finds the rock active', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRespawn.runActiveAfterRespawnTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('room disposed during the respawn is created again with the rock active', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRespawn.runDisposedDuringRespawnTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsRespawn.run();
