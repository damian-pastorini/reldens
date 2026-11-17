/**
 *
 * Reldens - Test Interactive Objects Rewards
 *
 * Tests the rewards of the forest timing objects, checked on the recorded timingComplete message and the stored reward
 * quantity, with the fishing spot duration shortened for the group on the live spot (its client params): the mining
 * and the fishing complete with the rewarded flag and their item; a second player fishes right after the first one
 * finished; a reward rate that never wins, no rewards and an empty rewards list complete with no reward; of several
 * weighted rewards the rolled one is added; a reward key of no item cancels and the spot is used again; a duration of 0
 * or a missing duration completes at once and leaves no progress bar on the client; and every other fishing spot of
 * the forest starts its own timing and gives its own fish.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjectsRewards
{

    static FIRST_SPOT_KEY = 'fish_spawn_forest_1';
    static OTHER_SPOTS_KEYS = ['fish_spawn_forest_2', 'fish_spawn_forest_3', 'fish_spawn_forest_4', 'fish_spawn_forest_5', 'fish_spawn_forest_6'];
    static FISH_KEY = 'fish';
    static ORE_KEY = 'ore';
    static MISSING_ITEM_KEY = 'e2eMissingItem';
    static SHORT_DURATION_MS = 1000;

    static async fetchStored(gameConfig, itemKey)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, gameConfig.e2ePlayerName, itemKey);
    }

    static async prepareSpot(context, spotKey, changes = {})
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            spotKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The fisher must be placed next to '+spotKey+': '+placement.error).toBe(true);
        let spot = await TimingObjectSession.fetchTimingState(context.gameConfig, placement.bodyKey);
        let spotChanges = Object.assign({
            clientParams: Object.assign({}, spot.clientParams, {timingDuration: TestInteractiveObjectsRewards.SHORT_DURATION_MS})
        }, changes);
        for(let propertyKey of Object.keys(spotChanges)){
            await TimingObjectSession.changeObjectProperty(
                context.gameConfig,
                context.e2eGroup,
                placement.bodyKey,
                propertyKey,
                spotChanges[propertyKey]
            );
        }
        return {
            spotKey: placement.bodyKey,
            serverTimeout: TimeConstants.SERVER_RESPONSE,
            fishBefore: await TestInteractiveObjectsRewards.fetchStored(context.gameConfig, TestInteractiveObjectsRewards.FISH_KEY)
        };
    }

    static async enterForest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimingObjectSession.MINING_TEST_TIMEOUT, context.longRun));
        await TimingObjectSession.enterForestWithoutEnemies(context.page, context.gameConfig, context.longRun);
    }

    static async fetchTerminalMessage(page, timeout)
    {
        await page.waitForFunction(
            () => (window.e2eTimingMessages || []).some(message => 'timingStart' !== message.act),
            null,
            {timeout}
        );
        let terminalMessages = (await TimingObjectSession.fetchRecordedMessages(page)).filter(
            message => TimingMiningSteps.START !== message.act
        );
        expect(terminalMessages.length, 'One terminal message').toBe(1);
        return [...terminalMessages].shift();
    }

    static async fishOnce(context, spotKey, changes = {})
    {
        let fishing = await TestInteractiveObjectsRewards.prepareSpot(context, spotKey, changes);
        await TimingObjectSession.startTiming(context.page, fishing.spotKey, fishing.serverTimeout);
        fishing.terminal = await TestInteractiveObjectsRewards.fetchTerminalMessage(context.page, fishing.serverTimeout);
        return fishing;
    }

    static async expectFish(context, fishing, expectedFish, message)
    {
        await expect.poll(
            async () => await TestInteractiveObjectsRewards.fetchStored(context.gameConfig, TestInteractiveObjectsRewards.FISH_KEY),
            {message, timeout: fishing.serverTimeout}
        ).toBe(fishing.fishBefore + expectedFish);
    }

    static async runMiningCompleteTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        let terminal = await TestInteractiveObjectsRewards.fetchTerminalMessage(context.page, mining.duration + mining.serverTimeout);
        expect([terminal.act, terminal.rewarded, terminal.itemKey], 'The mining completes with the ore')
            .toEqual([TimingMiningSteps.COMPLETE, true, TestInteractiveObjectsRewards.ORE_KEY]);
    }

    static async runFishingCompleteTest(context)
    {
        await TestInteractiveObjectsRewards.enterForest(context);
        let fishing = await TestInteractiveObjectsRewards.fishOnce(context, TestInteractiveObjectsRewards.FIRST_SPOT_KEY);
        expect([fishing.terminal.act, fishing.terminal.rewarded, fishing.terminal.itemKey], 'The fishing completes with a fish')
            .toEqual([TimingMiningSteps.COMPLETE, true, TestInteractiveObjectsRewards.FISH_KEY]);
        await TestInteractiveObjectsRewards.expectFish(context, fishing, 1, 'One fish is stored');
    }

    static async runSecondFisherTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimingObjectSession.MINING_TEST_TIMEOUT + TimeConstants.GAME_START, context.longRun));
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        await TestInteractiveObjectsRewards.enterForest(context);
        let fishing = await TestInteractiveObjectsRewards.fishOnce(context, TestInteractiveObjectsRewards.FIRST_SPOT_KEY);
        expect(fishing.terminal.act, 'The first fisher completes').toBe(TimingMiningSteps.COMPLETE);
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            secondGameConfig,
            Login.FOREST_ROOM_NAME,
            fishing.spotKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The second fisher must be placed next to the spot').toBe(true);
        let secondFishBefore = await TestInteractiveObjectsRewards.fetchStored(secondGameConfig, TestInteractiveObjectsRewards.FISH_KEY);
        await TimingObjectSession.startTiming(context.secondPage, fishing.spotKey, fishing.serverTimeout);
        let secondTerminal = await TestInteractiveObjectsRewards.fetchTerminalMessage(context.secondPage, fishing.serverTimeout);
        expect([secondTerminal.act, secondTerminal.rewarded], 'The second fisher completes').toEqual([TimingMiningSteps.COMPLETE, true]);
        expect(await TestInteractiveObjectsRewards.fetchStored(secondGameConfig, TestInteractiveObjectsRewards.FISH_KEY), 'The second fish')
            .toBe(secondFishBefore + 1);
    }

    static async runNoRewardTest(context, rewards, message)
    {
        await TestInteractiveObjectsRewards.enterForest(context);
        let fishing = await TestInteractiveObjectsRewards.fishOnce(context, TestInteractiveObjectsRewards.FIRST_SPOT_KEY, {rewards});
        expect([fishing.terminal.act, fishing.terminal.rewarded], message).toEqual([TimingMiningSteps.COMPLETE, false]);
        await context.page.waitForTimeout(TimeConstants.ACTION);
        await TestInteractiveObjectsRewards.expectFish(context, fishing, 0, message+': no fish');
    }

    static async runWeightedRewardsTest(context)
    {
        await TestInteractiveObjectsRewards.enterForest(context);
        let oreBefore = await TestInteractiveObjectsRewards.fetchStored(context.gameConfig, TestInteractiveObjectsRewards.ORE_KEY);
        let fishing = await TestInteractiveObjectsRewards.fishOnce(context, TestInteractiveObjectsRewards.FIRST_SPOT_KEY, {
            rewards: [{key: TestInteractiveObjectsRewards.FISH_KEY, rate: 0}, {key: TestInteractiveObjectsRewards.ORE_KEY, rate: 100}]
        });
        expect([fishing.terminal.rewarded, fishing.terminal.itemKey], 'The rolled reward').toEqual([true, TestInteractiveObjectsRewards.ORE_KEY]);
        await expect.poll(
            async () => await TestInteractiveObjectsRewards.fetchStored(context.gameConfig, TestInteractiveObjectsRewards.ORE_KEY),
            {message: 'The rolled reward is stored', timeout: fishing.serverTimeout}
        ).toBe(oreBefore + 1);
        await TestInteractiveObjectsRewards.expectFish(context, fishing, 0, 'The other reward is not added');
    }

    static async runMissingItemTest(context)
    {
        await TestInteractiveObjectsRewards.enterForest(context);
        let fishing = await TestInteractiveObjectsRewards.fishOnce(context, TestInteractiveObjectsRewards.FIRST_SPOT_KEY, {
            rewards: [{key: TestInteractiveObjectsRewards.MISSING_ITEM_KEY, rate: 100}]
        });
        expect(fishing.terminal.act, 'A reward of no item cancels').toBe(TimingMiningSteps.CANCEL);
        expect((await TimingObjectSession.fetchTimingState(context.gameConfig, fishing.spotKey)).isActive, 'The spot is free')
            .toBe(false);
        await TimingObjectSession.startTiming(context.page, fishing.spotKey, fishing.serverTimeout);
    }

    static async runDurationTest(context, clientParamsChange, message)
    {
        await TestInteractiveObjectsRewards.enterForest(context);
        let spotKey = TestInteractiveObjectsRewards.FIRST_SPOT_KEY;
        let placement = await RoomObjectsApi.placePlayerNextToObject(context.page, context.gameConfig, Login.FOREST_ROOM_NAME, spotKey, TimeConstants.SCENE_LOAD);
        let spot = await TimingObjectSession.fetchTimingState(context.gameConfig, placement.bodyKey);
        let clientParams = clientParamsChange(Object.assign({}, spot.clientParams));
        await context.page.evaluate((change) => {
            window.reldens.getActiveScene().objectsAnimations[change.key].clientParams = change.clientParams;
        }, {key: placement.bodyKey, clientParams});
        let fishing = await TestInteractiveObjectsRewards.fishOnce(context, spotKey, {clientParams});
        expect([fishing.terminal.act, fishing.terminal.rewarded], message).toEqual([TimingMiningSteps.COMPLETE, true]);
        expect(await TimingMiningSteps.fetchClientTiming(context.page, fishing.spotKey), message+': no bar left')
            .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
    }

    static async runOtherSpotsTest(context)
    {
        await TestInteractiveObjectsRewards.enterForest(context);
        let fishBefore = await TestInteractiveObjectsRewards.fetchStored(context.gameConfig, TestInteractiveObjectsRewards.FISH_KEY);
        for(let spotKey of TestInteractiveObjectsRewards.OTHER_SPOTS_KEYS){
            let fishing = await TestInteractiveObjectsRewards.fishOnce(context, spotKey);
            expect([fishing.spotKey, fishing.terminal.key, fishing.terminal.rewarded], spotKey+' gives its own fish')
                .toEqual([spotKey, spotKey, true]);
        }
        await expect.poll(
            async () => await TestInteractiveObjectsRewards.fetchStored(context.gameConfig, TestInteractiveObjectsRewards.FISH_KEY),
            {message: 'Every spot gives one fish', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(fishBefore + TestInteractiveObjectsRewards.OTHER_SPOTS_KEYS.length);
    }

    static run()
    {
        test.describe('Interactive Objects Rewards', () => {
            test('mining completes rewarded with the ore', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runMiningCompleteTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('fishing completes rewarded with a fish', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runFishingCompleteTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player fishes right after the first one finished', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runSecondFisherTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward rate that never wins completes with no reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runNoRewardTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    [{key: TestInteractiveObjectsRewards.FISH_KEY, rate: 0}],
                    'A losing roll'
                );
            });
            test('no rewards completes with no reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runNoRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, null, 'No rewards');
            });
            test('empty rewards list completes with no reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runNoRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, [], 'Empty rewards');
            });
            test('weighted rewards add the rolled reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runWeightedRewardsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward of no item cancels and the spot is used again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runMissingItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('duration 0 completes at once with no bar left', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runDurationTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    (clientParams) => Object.assign(clientParams, {timingDuration: 0}),
                    'Duration 0'
                );
            });
            test('missing duration completes at once with no bar left', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runDurationTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    (clientParams) => {
                        delete clientParams.timingDuration;
                        return clientParams;
                    },
                    'Missing duration'
                );
            });
            test('every other fishing spot gives its own fish', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRewards.runOtherSpotsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestInteractiveObjectsRewards.run();
