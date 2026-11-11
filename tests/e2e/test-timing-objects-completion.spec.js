/**
 *
 * Reldens - Test Timing Objects Completion
 *
 * Tests the completion of a timing object on the first forest mining rock (TimingMiningSteps) with the inventory
 * "addItem" of the miner overridden for the group (TimingObjectsProbe): a reward the inventory does not add (answering
 * false, like a full inventory) cancels the mining with no reward and frees the rock; a reward add that throws ends the
 * mining with no message and no reward, the error logged, and the rock can be mined again; a move while the reward is
 * being added (the add delayed) keeps the reward and sends no cancel; and another player that clicks the rock while
 * the reward of the miner is being added starts no second timing.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsCompletion
{

    static ADD_ITEM_METHOD = 'addItem';
    static ADD_DELAY_MS = 2000;
    static AFTER_TIMER_MS = 300;

    static async overrideAddItem(context, behavior)
    {
        await TimingObjectSession.overrideInventoryMethod(
            context.gameConfig,
            context.e2eGroup,
            TestTimingObjectsCompletion.ADD_ITEM_METHOD,
            behavior
        );
    }

    static async expectRockFree(context, mining, message)
    {
        await expect.poll(
            async () => (await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey)).isActive,
            {message, timeout: mining.serverTimeout}
        ).toBe(false);
    }

    static async runFailedAddTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TestTimingObjectsCompletion.overrideAddItem(context, {failuresCount: 1, rejects: false});
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCancelled(context.page, mining, 'A reward not added cancels the mining');
        await TestTimingObjectsCompletion.expectRockFree(context, mining, 'The rock is free after the failed add');
    }

    static async runThrowingAddTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TestTimingObjectsCompletion.overrideAddItem(context, {failuresCount: 1, rejects: true});
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingObjectSession.expectRewardAfterDuration(context.page, mining, mining.rewardQtyBefore, 'No reward');
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'No terminal message')
            .toEqual([TimingMiningSteps.START]);
        await TestTimingObjectsCompletion.expectRockFree(context, mining, 'The rock is free after the error');
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The rock is mined again');
    }

    static async runMoveDuringAddTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TestTimingObjectsCompletion.overrideAddItem(context, {delayMs: TestTimingObjectsCompletion.ADD_DELAY_MS});
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await context.page.waitForTimeout(mining.duration + TestTimingObjectsCompletion.AFTER_TIMER_MS);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'The reward is still being added')
            .toEqual([TimingMiningSteps.START]);
        await TimingObjectSession.sideStep(context.page);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'A move during the add keeps the reward');
    }

    static async runSecondClickDuringAddTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.startConfigPlayer(context.secondPage, secondGameConfig, context.longRun, Login.FOREST_ROOM_NAME);
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            Login.fetchSecondPlayerConfig(context.gameConfig),
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2eMiningRockKey,
            TimeConstants.SCENE_LOAD
        );
        expect([placed.reached, placed.bodyKey], 'The second player must be placed next to the rock')
            .toEqual([true, mining.rockKey]);
        expect(TimingMiningSteps.isInsideArea(placed.position, mining.rock), 'The second player reaches the rock').toBe(true);
        await TimingObjectSession.recordTimingActions(context.secondPage);
        await TestTimingObjectsCompletion.overrideAddItem(context, {delayMs: TestTimingObjectsCompletion.ADD_DELAY_MS});
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await context.page.waitForTimeout(mining.duration + TestTimingObjectsCompletion.AFTER_TIMER_MS);
        expect(await Phaser.triggerObjectInteraction(context.secondPage, mining.rockKey), 'The second click is sent')
            .toBeTruthy();
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The miner gets the reward');
        expect(await TimingObjectSession.fetchRecordedActions(context.secondPage), 'No second timing starts')
            .toEqual([]);
    }

    static run()
    {
        test.describe('Timing Objects Completion', () => {
            test('reward not added cancels the mining and frees the rock', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsCompletion.runFailedAddTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward add error ends the mining without a reward and the rock is mined again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsCompletion.runThrowingAddTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('move while the reward is being added keeps the reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsCompletion.runMoveDuringAddTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second click while the reward is being added starts no timing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsCompletion.runSecondClickDuringAddTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsCompletion.run();
