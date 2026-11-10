/**
 *
 * Reldens - Test Item Growth Failures
 *
 * Tests the growing sword level up with delayed and failed steps (ItemGrowthSteps: the sword seeded in the player
 * inventory and equipped in the forest, the experience added to the player class path, the same path a kill reward
 * uses, and a method of the live sword or of the inventory growth applier delayed or failed for the group): two
 * experiences received while the level up unequip is delayed are both kept and added in order, with one level up and
 * one level reached message; a failed unequip stops the level up (the sword stays equipped on its level with its
 * modifier) and the next experience reaches the level; a failed level up listener still equips the sword again with
 * its scaled modifier applied once on the player stat; and a failed growth save stores nothing and does not break the
 * next experience, which stores the whole live growth.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthFailures
{

    static SECOND_LEVEL = 2;
    static THIRD_LEVEL = 3;
    static SMALL_EXPERIENCE = 1;
    static LEVEL_UP_DELAY_MS = 1000;
    static FORCED_FAILURE = {failuresCount: 1, rejects: true};

    static async runExperienceDuringLevelUpTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthFailures.SECOND_LEVEL);
        let totalExperience = threshold + TestItemGrowthFailures.SMALL_EXPERIENCE;
        expect(totalExperience, 'Both experiences must stay below the next level').toBeLessThan(
            ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthFailures.THIRD_LEVEL)
        );
        await ItemGrowthSteps.overrideItemMethod(context, started.item.inventoryId, 'unequip', {
            delayMs: TestItemGrowthFailures.LEVEL_UP_DELAY_MS
        });
        let playerName = context.gameConfig.e2ePlayerName;
        await Promise.all([
            ItemGrowthSteps.addExperience(context.gameConfig, playerName, threshold),
            ItemGrowthSteps.addExperience(context.gameConfig, playerName, TestItemGrowthFailures.SMALL_EXPERIENCE)
        ]);
        let item = await ItemGrowthSteps.waitForStoredGrowth(context, {
            level: TestItemGrowthFailures.SECOND_LEVEL,
            experience: totalExperience
        });
        expect(item.growthExperience, 'The live sword keeps both experiences').toBe(totalExperience);
        expect(
            (await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.ITEM_CALLS_PREFIX+item.inventoryId, 'unequip')).called,
            'Only one level up unequips the sword'
        ).toBe(1);
        await ItemGrowthChecks.expectLevelMessages(context.page, 1);
        await ItemGrowthChecks.expectItemOnLevel(context, started, item, TestItemGrowthFailures.SECOND_LEVEL);
    }

    static async runFailedUnequipTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthFailures.SECOND_LEVEL);
        await ItemGrowthSteps.overrideItemMethod(
            context,
            started.item.inventoryId,
            'unequip',
            TestItemGrowthFailures.FORCED_FAILURE
        );
        let stoppedItem = await ItemGrowthSteps.gainExperience(context, threshold, {level: 1, experience: threshold});
        await ItemGrowthChecks.expectItemOnLevel(context, started, stoppedItem, 1);
        await ItemGrowthChecks.expectLevelMessages(context.page, 0);
        let grownItem = await ItemGrowthSteps.gainExperience(context, TestItemGrowthFailures.SMALL_EXPERIENCE, {
            level: TestItemGrowthFailures.SECOND_LEVEL,
            experience: threshold + TestItemGrowthFailures.SMALL_EXPERIENCE
        });
        await ItemGrowthChecks.expectItemOnLevel(context, started, grownItem, TestItemGrowthFailures.SECOND_LEVEL);
        await ItemGrowthChecks.expectLevelMessages(context.page, 1);
        expect(
            await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.ITEM_CALLS_PREFIX+grownItem.inventoryId, 'unequip'),
            'The first unequip failed and the next level up unequipped the sword'
        ).toEqual({left: 0, done: 1, called: 2});
    }

    static async runFailedListenerTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthFailures.SECOND_LEVEL);
        await ItemGrowthSteps.overrideGrowthApplier(context, 'applyReachedLevel', TestItemGrowthFailures.FORCED_FAILURE);
        let grownItem = await ItemGrowthSteps.gainExperience(context, threshold, {
            level: TestItemGrowthFailures.SECOND_LEVEL,
            experience: threshold
        });
        await ItemGrowthChecks.expectItemOnLevel(context, started, grownItem, TestItemGrowthFailures.SECOND_LEVEL);
        expect(
            await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.APPLIER_CALLS_KEY, 'applyReachedLevel'),
            'The level up listener failed once'
        ).toEqual({left: 0, done: 1, called: 1});
    }

    static async runFailedSaveTest(context)
    {
        await ItemGrowthSteps.startGrowth(context);
        await ItemGrowthSteps.overrideGrowthApplier(context, 'saveItemGrowth', TestItemGrowthFailures.FORCED_FAILURE);
        let playerName = context.gameConfig.e2ePlayerName;
        await ItemGrowthSteps.addExperience(context.gameConfig, playerName, TestItemGrowthFailures.SMALL_EXPERIENCE);
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.APPLIER_CALLS_KEY, 'saveItemGrowth')).done,
            {message: 'The growth save must fail once', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        expect(await ItemGrowthSteps.fetchItemGrowth(context.gameConfig, playerName), 'The failed save stores nothing')
            .toEqual({});
        await ItemGrowthSteps.gainExperience(context, TestItemGrowthFailures.SMALL_EXPERIENCE, {
            level: 1,
            experience: 2 * TestItemGrowthFailures.SMALL_EXPERIENCE
        });
    }

    static run()
    {
        test.describe('Item Growth Failures', () => {
            test('two experiences during one level up are both kept and added in order', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthFailures.runExperienceDuringLevelUpTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed unequip stops the level up and the next experience reaches the level', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthFailures.runFailedUnequipTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed level up listener still equips the sword again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthFailures.runFailedListenerTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed growth save does not break the next experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthFailures.runFailedSaveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthFailures.run();
