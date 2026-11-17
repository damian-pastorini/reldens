/**
 *
 * Reldens - Test Timing Objects Leaving
 *
 * Tests a miner that leaves the forest during a timing on the first forest mining rock (TimingMiningSteps), checked on
 * the stored reward quantity: a scene change (the miner placed on the change point to the town, with the move rule off
 * so the placement itself does not cancel the mining) stops the mining with
 * no reward and no message, no progress bar or tool sprite stays in any scene of that client and another player mines
 * the same rock; a reload (the socket closed) gives no reward to the old session and the same player mines again after
 * joining; the same account logged in from a second page gives no reward to the first session and mines from the new
 * one; and a leave in the last checks interval before the timer ends (the timing stop held for the group, so the
 * completion runs for the player that left) gives no reward.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsLeaving
{

    static BAR_DEPTH = 9999;
    static TOOL_TEXTURE_PREFIX = 'timing-tool-';

    static async fetchStoredReward(gameConfig, mining)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, gameConfig.e2ePlayerName, mining.rewardItemId);
    }

    static async prepare(context, rules = {})
    {
        let mining = await TimingMiningSteps.prepare(context, rules);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        mining.storedBefore = await TestTimingObjectsLeaving.fetchStoredReward(context.gameConfig, mining);
        return mining;
    }

    static async expectNoReward(context, mining, message)
    {
        await context.page.waitForTimeout(mining.duration + TimeConstants.ACTION);
        expect(await TestTimingObjectsLeaving.fetchStoredReward(context.gameConfig, mining), message+': no reward')
            .toBe(mining.storedBefore);
        expect((await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey)).isActive, message+': free')
            .toBe(false);
    }

    static async mineAgain(page, gameConfig, mining, storedBefore)
    {
        let rockKey = await TimingObjectSession.placeNextToObject(
            page,
            gameConfig,
            gameConfig.e2eMiningRockKey,
            TimeConstants.SCENE_LOAD,
            'mining rock'
        );
        expect(rockKey, 'The same rock is mined again').toBe(mining.rockKey);
        await TimingObjectSession.startTiming(page, rockKey, mining.serverTimeout);
        await TimingObjectSession.waitForTimingAction(page, TimingMiningSteps.COMPLETE, mining.duration + mining.serverTimeout);
        await expect.poll(
            async () => await TestTimingObjectsLeaving.fetchStoredReward(gameConfig, mining),
            {message: 'The rock is mined again with one reward', timeout: mining.serverTimeout}
        ).toBe(storedBefore + 1);
    }

    static async fetchTimingLeftovers(page)
    {
        return await page.evaluate((keys) => window.reldens.gameEngine.scene.scenes.reduce((leftovers, scene) => {
            let children = scene.children ? scene.children.list : [];
            leftovers.bars += children.filter(child => keys.barDepth === child.depth).length;
            leftovers.tools += children.filter(
                child => child.texture && 0 === String(child.texture.key).indexOf(keys.toolPrefix)
            ).length;
            return leftovers;
        }, {bars: 0, tools: 0}), {
            barDepth: TestTimingObjectsLeaving.BAR_DEPTH,
            toolPrefix: TestTimingObjectsLeaving.TOOL_TEXTURE_PREFIX
        });
    }

    static async runSceneChangeTest(context)
    {
        let mining = await TestTimingObjectsLeaving.prepare(context, {cancelOnMove: false});
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            Login.TOWN_ROOM_NAME
        );
        expect(placed.position, 'The miner must be placed on the change point to the town: '+placed.error).toBeTruthy();
        await Navigation.waitForRoom(context.page, Login.TOWN_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        await TestTimingObjectsLeaving.expectNoReward(context, mining, 'The scene change stops the mining');
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'No message on the stop')
            .toEqual([TimingMiningSteps.START]);
        expect(await TestTimingObjectsLeaving.fetchTimingLeftovers(context.page), 'No bar or tool stays')
            .toEqual({bars: 0, tools: 0});
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        await TestTimingObjectsLeaving.mineAgain(
            context.secondPage,
            secondGameConfig,
            mining,
            await TestTimingObjectsLeaving.fetchStoredReward(secondGameConfig, mining)
        );
    }

    static async runReloadTest(context)
    {
        let mining = await TestTimingObjectsLeaving.prepare(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await context.page.reload();
        await TestTimingObjectsLeaving.expectNoReward(context, mining, 'The reload stops the mining');
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await TestTimingObjectsLeaving.mineAgain(context.page, context.gameConfig, mining, mining.storedBefore);
    }

    static async runSecondLoginTest(context)
    {
        let mining = await TestTimingObjectsLeaving.prepare(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        let secondClient = await Login.openClientPage(context.page, context.gameConfig);
        await Login.loginAndStartGame(
            secondClient.clientPage,
            context.gameConfig.e2eUsername,
            context.gameConfig.e2ePassword,
            context.gameConfig.e2ePlayerName,
            context.longRun,
            false,
            Login.FOREST_ROOM_NAME
        );
        await TestTimingObjectsLeaving.expectNoReward(context, mining, 'The second login stops the first session mining');
        await TestTimingObjectsLeaving.mineAgain(secondClient.clientPage, context.gameConfig, mining, mining.storedBefore);
        await secondClient.clientContext.close();
    }

    static async runLastIntervalLeaveTest(context)
    {
        let mining = await TestTimingObjectsLeaving.prepare(context);
        await TimingObjectSession.holdTimingStop(context.gameConfig, context.e2eGroup, mining.rockKey);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await context.page.reload();
        await TestTimingObjectsLeaving.expectNoReward(context, mining, 'A leave before the timer ends');
    }

    static run()
    {
        test.describe('Timing Objects Leaving', () => {
            test('scene change stops the mining and another player mines the rock', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLeaving.runSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reload stops the mining and the player mines again after joining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLeaving.runReloadTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second login of the account stops the first session mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLeaving.runSecondLoginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('leave in the last checks interval gives no reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLeaving.runLastIntervalLeaveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsLeaving.run();
