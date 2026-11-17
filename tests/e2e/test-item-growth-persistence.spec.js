/**
 *
 * Reldens - Test Item Growth Persistence
 *
 * Tests how the growing sword level and experience are kept (ItemGrowthSteps: the sword seeded in the player inventory
 * and equipped in the forest, grown to the second level with experience added to the player class path): the unequip
 * after a level up leaves the stat without the scaled modifier; after a page reload and a new login the stored level
 * and experience load, the scaled modifier is on the player stat once and the equipment details show the level and
 * the modifier; the unequip after the new login leaves the stat without the modifier and the inventory details keep the
 * level; the scene change keeps the level, the modifier, the stat and the details, and the next experience is added and
 * saved once; an invalid or empty stored customData starts the sword at the first level; the other keys of the stored
 * customData are kept on the growth save; an experience followed by an immediate disconnect (the save delayed) is
 * stored and loaded on the next login; and a sword obtained during the game starts at the first level and grows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthPersistence
{

    static SECOND_LEVEL = 2;
    static SMALL_EXPERIENCE = 1;
    static SAVE_DELAY_MS = 1500;
    static KEPT_CUSTOM_DATA = {e2eKept: 'kept value'};
    static INVALID_CUSTOM_DATA = ['not a json', ''];

    static async growToSecondLevel(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        started.threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthPersistence.SECOND_LEVEL);
        await ItemGrowthSteps.gainExperience(context, started.threshold, {
            level: TestItemGrowthPersistence.SECOND_LEVEL,
            experience: started.threshold
        });
        return started;
    }

    static async runUnequipAfterLevelUpTest(context)
    {
        let started = await TestItemGrowthPersistence.growToSecondLevel(context);
        let playerName = context.gameConfig.e2ePlayerName;
        await ItemGrowthSteps.toggleEquip(
            context.page,
            context.gameConfig,
            await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, playerName),
            false
        );
        await ItemGrowthChecks.expectItemOnLevel(
            context,
            started,
            await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, playerName),
            TestItemGrowthPersistence.SECOND_LEVEL,
            false
        );
    }

    static async runReloginTest(context)
    {
        let started = await TestItemGrowthPersistence.growToSecondLevel(context);
        let item = await ItemGrowthSteps.reEnterForest(context);
        expect(item.growthExperience, 'The stored experience is loaded').toBe(started.threshold);
        await ItemGrowthChecks.expectItemOnLevel(context, started, item, TestItemGrowthPersistence.SECOND_LEVEL);
        await ItemGrowthChecks.showLevelDetails(context, started, TestItemGrowthPersistence.SECOND_LEVEL);
    }

    static async runUnequipAfterReloginTest(context)
    {
        let started = await TestItemGrowthPersistence.growToSecondLevel(context);
        let item = await ItemGrowthSteps.reEnterForest(context);
        await ItemGrowthSteps.toggleEquip(context.page, context.gameConfig, item, false);
        await ItemGrowthChecks.expectItemOnLevel(
            context,
            started,
            await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName),
            TestItemGrowthPersistence.SECOND_LEVEL,
            false
        );
        await ItemGrowthChecks.showLevelDetails(context, started, TestItemGrowthPersistence.SECOND_LEVEL, false);
    }

    static async runSceneChangeTest(context)
    {
        let started = await TestItemGrowthPersistence.growToSecondLevel(context);
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        await ItemGrowthChecks.expectItemOnLevel(
            context,
            started,
            await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, context.gameConfig.e2ePlayerName, Login.TOWN_ROOM_NAME),
            TestItemGrowthPersistence.SECOND_LEVEL,
            true,
            Login.TOWN_ROOM_NAME
        );
        await ItemGrowthChecks.showLevelDetails(context, started, TestItemGrowthPersistence.SECOND_LEVEL);
    }

    static async runSceneChangeExperienceTest(context)
    {
        let started = await TestItemGrowthPersistence.growToSecondLevel(context);
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        await ItemGrowthSteps.overrideGrowthApplier(context, 'saveItemGrowth', {});
        let experience = started.threshold + TestItemGrowthPersistence.SMALL_EXPERIENCE;
        let item = await ItemGrowthSteps.gainExperience(
            context,
            TestItemGrowthPersistence.SMALL_EXPERIENCE,
            {level: TestItemGrowthPersistence.SECOND_LEVEL, experience},
            Login.TOWN_ROOM_NAME
        );
        expect(item.growthExperience, 'The live sword adds the experience once').toBe(experience);
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(
            (await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.APPLIER_CALLS_KEY, 'saveItemGrowth')).called,
            'Only the sword of the new room saves the growth'
        ).toBe(1);
    }

    static async runInvalidCustomDataTest(context, inventoryCustomData)
    {
        let started = await ItemGrowthSteps.startGrowth(context, {}, [], true, inventoryCustomData);
        expect(started.item.growthExperience, 'The sword starts with no experience').toBe(0);
        await ItemGrowthChecks.expectItemOnLevel(context, started, started.item, 1);
        await ItemGrowthSteps.gainExperience(context, TestItemGrowthPersistence.SMALL_EXPERIENCE, {
            level: 1,
            experience: TestItemGrowthPersistence.SMALL_EXPERIENCE
        });
    }

    static async runKeptKeysTest(context)
    {
        await ItemGrowthSteps.startGrowth(
            context,
            {},
            [],
            true,
            sc.toJsonString(TestItemGrowthPersistence.KEPT_CUSTOM_DATA)
        );
        let growth = {level: 1, experience: TestItemGrowthPersistence.SMALL_EXPERIENCE};
        await ItemGrowthSteps.gainExperience(context, TestItemGrowthPersistence.SMALL_EXPERIENCE, growth);
        let storedRow = [...await E2eSeedAndRestoreApi.loadInventoryRows(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            ItemGrowthSteps.ITEM_KEY
        )].shift();
        expect(sc.toJson(storedRow.customData, {}), 'The other stored keys are kept with the growth').toEqual(
            Object.assign({}, TestItemGrowthPersistence.KEPT_CUSTOM_DATA, {growth})
        );
    }

    static async runImmediateDisconnectTest(context)
    {
        await ItemGrowthSteps.startGrowth(context);
        await ItemGrowthSteps.overrideGrowthApplier(context, 'saveItemGrowth', {
            delayMs: TestItemGrowthPersistence.SAVE_DELAY_MS
        });
        let addedExperience = ItemGrowthSteps.addExperience(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            TestItemGrowthPersistence.SMALL_EXPERIENCE
        );
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.APPLIER_CALLS_KEY, 'saveItemGrowth')).called,
            {message: 'The growth save must start', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await context.page.reload();
        await addedExperience;
        let item = await ItemGrowthSteps.reEnterForest(context);
        let growth = {level: 1, experience: TestItemGrowthPersistence.SMALL_EXPERIENCE};
        expect(
            await ItemGrowthSteps.fetchItemGrowth(context.gameConfig, context.gameConfig.e2ePlayerName),
            'The growth saved after the disconnect is stored'
        ).toEqual(growth);
        expect([item.growthLevel, item.growthExperience], 'The new login loads the saved growth').toEqual(
            [growth.level, growth.experience]
        );
    }

    static async runObtainedItemTest(context)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + ItemGrowthSteps.GROWTH_TIME_OUT_MS
        );
        let playerName = context.gameConfig.e2ePlayerName;
        await E2eSeedAndRestoreApi.preserveRows(
            context.gameConfig,
            context.e2eGroup,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(context.gameConfig, playerName, ItemGrowthSteps.ITEM_KEY)
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await ItemGrowthSteps.giveGrowingItem(context);
        let item = await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, playerName);
        expect([item.growthLevel, item.growthExperience], 'The obtained sword starts at the first level').toEqual([1, 0]);
        await ItemGrowthSteps.toggleEquip(context.page, context.gameConfig, item, true);
        await ItemGrowthSteps.gainExperience(context, TestItemGrowthPersistence.SMALL_EXPERIENCE, {
            level: 1,
            experience: TestItemGrowthPersistence.SMALL_EXPERIENCE
        });
    }

    static run()
    {
        test.describe('Item Growth Persistence', () => {
            test('unequip after a level up removes the scaled modifier from the stat', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runUnequipAfterLevelUpTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('new login loads the grown sword with its modifier applied once and its details', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runReloginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unequip after a new login removes the modifier and the details keep the level', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runUnequipAfterReloginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('scene change keeps the level, the modifier, the stat and the details', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runSceneChangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('experience after a scene change is added and saved once', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runSceneChangeExperienceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            for(let inventoryCustomData of TestItemGrowthPersistence.INVALID_CUSTOM_DATA){
                test('stored customData "'+inventoryCustomData+'" starts the sword at the first level', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                    await TestItemGrowthPersistence.runInvalidCustomDataTest(
                        {page, screenshots, gameConfig, e2eGroup, longRun},
                        inventoryCustomData
                    );
                });
            }
            test('other stored customData keys are kept when the growth is saved', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runKeptKeysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('experience and an immediate disconnect keep the growth for the next login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runImmediateDisconnectTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('sword obtained during the game starts at the first level and grows', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPersistence.runObtainedItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthPersistence.run();
