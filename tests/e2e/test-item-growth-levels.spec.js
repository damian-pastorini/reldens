/**
 *
 * Reldens - Test Item Growth Levels
 *
 * Tests how the growing sword levels (ItemGrowthSteps: the sword seeded in the player inventory and equipped in the
 * forest, its growth configuration changed for the group before the login, the experience added to the player class
 * path directly, the experience a player gets from something that is not a kill): an experience one below the next
 * level threshold is stored with no level up and no level reached message; an experience exactly at the threshold
 * reaches the level, scales the modifier and sends the level reached message; further gains reach the next levels, one
 * gain reaches several levels and the last level keeps adding experience; with modifiersIncreasePercentPerLevel 0 or
 * missing the reached level keeps the modifier value; with requireEquipped an unequipped sword gets no experience and
 * with requireEquipped false it grows; the experienceShare below 100 gives that share, 0 gives nothing and a missing
 * share gives the whole experience; an experience that levels the player (its class path lowered to the first level
 * for the group) and the sword together leaves the stat with the player level modifiers and the scaled sword modifier
 * once; and an equipped item that is not growing gets no growth data saved.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { PlayerLevelSteps } = require('./helpers/player-level-steps');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ItemGrowthCalculator, ItemsConst } = require('@reldens/items-system');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthLevels
{

    static PERCENT_KEY = 'modifiersIncreasePercentPerLevel';
    static SHARE_KEY = 'experienceShare';
    static HALF_SHARE = 50;
    static EXTRA_EXPERIENCE = 7;
    static PLAYER_NEXT_LEVEL = 2;

    static fetchModifierValue(item, modifierKey)
    {
        let modifier = item.modifiers.find(itemModifier => modifierKey === itemModifier.key);
        expect(modifier, 'The item must have the '+modifierKey+' modifier').toBeTruthy();
        return modifier.value;
    }

    static async addExperienceWithNoGrowth(context, experience, message)
    {
        await ItemGrowthSteps.addExperience(context.gameConfig, context.gameConfig.e2ePlayerName, experience);
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(await ItemGrowthSteps.fetchItemGrowth(context.gameConfig, context.gameConfig.e2ePlayerName), message)
            .toEqual({});
    }

    static async runBelowThresholdTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let itemData = await ItemGrowthSteps.loadGrowingItemData(context.gameConfig);
        let experience = ItemGrowthChecks.levelThreshold(started.growth, 2) - 1;
        let item = await ItemGrowthSteps.gainExperience(context, experience, {level: 1, experience});
        expect(item.growthLevel, 'The item stays on the first level').toBe(1);
        expect(TestItemGrowthLevels.fetchModifierValue(item, itemData.modifierRow.key), 'The modifier is not scaled')
            .toBe(Number(itemData.modifierRow.value));
        expect(await ItemGrowthSteps.fetchLevelMessages(context.page), 'No level reached message').toEqual([]);
    }

    static async runThresholdTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let itemData = await ItemGrowthSteps.loadGrowingItemData(context.gameConfig);
        let experience = ItemGrowthChecks.levelThreshold(started.growth, 2);
        let item = await ItemGrowthSteps.gainExperience(context, experience, {level: 2, experience});
        expect(TestItemGrowthLevels.fetchModifierValue(item, itemData.modifierRow.key), 'The modifier is scaled').toBe(
            ItemGrowthCalculator.scaledValue(itemData.modifierRow.value, 2, started.growth[TestItemGrowthLevels.PERCENT_KEY])
        );
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchLevelMessages(context.page)).length,
            {message: 'The level reached message reaches the owner', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
    }

    static async runFurtherLevelsTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let lastLevel = Math.max(...Object.keys(started.growth.levels).map(Number));
        let secondThreshold = ItemGrowthChecks.levelThreshold(started.growth, 2);
        await ItemGrowthSteps.gainExperience(context, secondThreshold, {level: 2, experience: secondThreshold});
        let fourthThreshold = ItemGrowthChecks.levelThreshold(started.growth, 4);
        await ItemGrowthSteps.gainExperience(
            context,
            fourthThreshold - secondThreshold,
            {level: 4, experience: fourthThreshold}
        );
        let lastExperience = ItemGrowthChecks.levelThreshold(started.growth, lastLevel)
            + TestItemGrowthLevels.EXTRA_EXPERIENCE;
        let item = await ItemGrowthSteps.gainExperience(
            context,
            lastExperience - fourthThreshold,
            {level: lastLevel, experience: lastExperience}
        );
        expect(item.growthLevel, 'The last level is reached and keeps the extra experience').toBe(lastLevel);
    }

    static async runSameModifierTest(context, growthChanges, removedKeys)
    {
        let started = await ItemGrowthSteps.startGrowth(context, growthChanges, removedKeys);
        let itemData = await ItemGrowthSteps.loadGrowingItemData(context.gameConfig);
        let experience = ItemGrowthChecks.levelThreshold(started.growth, 2);
        let item = await ItemGrowthSteps.gainExperience(context, experience, {level: 2, experience});
        expect(
            TestItemGrowthLevels.fetchModifierValue(item, itemData.modifierRow.key),
            'The reached level keeps the modifier value'
        ).toBe(Number(itemData.modifierRow.value));
    }

    static async runUnequippedTest(context, requireEquipped)
    {
        let started = await ItemGrowthSteps.startGrowth(context, {requireEquipped}, [], false);
        let experience = ItemGrowthChecks.levelThreshold(started.growth, 2);
        if(requireEquipped){
            return await TestItemGrowthLevels.addExperienceWithNoGrowth(
                context,
                experience,
                'The unequipped item gets no experience'
            );
        }
        await ItemGrowthSteps.gainExperience(context, experience, {level: 2, experience});
    }

    static async runShareTest(context, growthChanges, removedKeys, gainedExperience, expectedExperience)
    {
        let started = await ItemGrowthSteps.startGrowth(context, growthChanges, removedKeys);
        if(0 === expectedExperience){
            return await TestItemGrowthLevels.addExperienceWithNoGrowth(
                context,
                gainedExperience,
                'A share of 0 gives no experience'
            );
        }
        await ItemGrowthSteps.gainExperience(context, gainedExperience, {
            level: ItemGrowthCalculator.levelFor(expectedExperience, started.growth.levels, ItemsConst.GROWTH.DEFAULT_LEVEL),
            experience: expectedExperience
        });
    }

    static async runPlayerAndItemLevelUpTest(context)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        await PlayerLevelSteps.setClassPathLevel(gameConfig, context.e2eGroup, ItemsConst.GROWTH.DEFAULT_LEVEL, 0);
        let experience = Math.max(...(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsLevels', {
            key: TestItemGrowthLevels.PLAYER_NEXT_LEVEL
        })).map(levelRow => Number(levelRow.required_experience)));
        let started = await ItemGrowthSteps.startGrowth(context);
        let playerBefore = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName);
        let itemLevel = ItemGrowthCalculator.levelFor(experience, started.growth.levels, ItemsConst.GROWTH.DEFAULT_LEVEL);
        let item = await ItemGrowthSteps.gainExperience(context, experience, {level: itemLevel, experience});
        let playerAfter = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName);
        let statKey = started.itemData.statKey;
        let levelIncrease = playerAfter.statsBase[statKey] - playerBefore.statsBase[statKey];
        expect([playerAfter.level, 0 < levelIncrease], 'The player reaches the next level with its stat modifiers').toEqual(
            [TestItemGrowthLevels.PLAYER_NEXT_LEVEL, true]
        );
        let scaledValue = ItemGrowthCalculator.scaledValue(started.itemData.modifierRow.value, itemLevel, started.growth[TestItemGrowthLevels.PERCENT_KEY]);
        expect(
            [TestItemGrowthLevels.fetchModifierValue(item, started.itemData.modifierRow.key), playerAfter.stats[statKey]],
            'The stat holds the player level modifiers and the scaled sword modifier once'
        ).toEqual([
            scaledValue,
            playerBefore.stats[statKey] + levelIncrease + scaledValue - Number(started.itemData.modifierRow.value)
        ]);
    }

    static async runNotGrowingItemTest(context)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + ItemGrowthSteps.GROWTH_TIME_OUT_MS
        );
        let itemKey = context.gameConfig.e2eEquipableItemId;
        let playerName = context.gameConfig.e2ePlayerName;
        let rowsBefore = await E2eSeedAndRestoreApi.preserveRows(
            context.gameConfig,
            context.e2eGroup,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(context.gameConfig, playerName, itemKey)
        );
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let item = (await ItemGrowthSteps.fetchItems(context.gameConfig, playerName)).find(
            inventoryItem => itemKey === inventoryItem.key
        );
        expect(item, 'The player must carry the not growing item').toBeTruthy();
        if(!item.equipped){
            await ItemGrowthSteps.toggleEquip(context.page, context.gameConfig, item, true);
        }
        await ItemGrowthSteps.addExperience(context.gameConfig, playerName, TestItemGrowthLevels.EXTRA_EXPERIENCE);
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        let itemAfter = (await ItemGrowthSteps.fetchItems(context.gameConfig, playerName)).find(
            inventoryItem => itemKey === inventoryItem.key
        );
        expect([itemAfter.growthLevel, itemAfter.growthExperience], 'The not growing item gets no growth data').toEqual(
            [false, false]
        );
        expect(
            (await E2eSeedAndRestoreApi.loadInventoryRows(context.gameConfig, playerName, itemKey)).map(row => row.customData),
            'No growth is saved for the not growing item'
        ).toEqual(rowsBefore.map(row => row.customData));
    }

    static run()
    {
        test.describe('Item Growth Levels', () => {
            test('experience one below the threshold keeps the level with no level message', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runBelowThresholdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('experience not from a kill exactly at the threshold reaches the level', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runThresholdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('further gains reach the next levels, several levels at once and the last level keeps the experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runFurtherLevelsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('increase percent 0 keeps the modifier value on the level up', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runSameModifierTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {[TestItemGrowthLevels.PERCENT_KEY]: 0},
                    []
                );
            });
            test('increase percent missing keeps the modifier value on the level up', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runSameModifierTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {},
                    [TestItemGrowthLevels.PERCENT_KEY]
                );
            });
            test('unequipped item with requireEquipped gets no experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runUnequippedTest({page, screenshots, gameConfig, e2eGroup, longRun}, true);
            });
            test('unequipped item with requireEquipped false grows', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runUnequippedTest({page, screenshots, gameConfig, e2eGroup, longRun}, false);
            });
            test('experience share below 100 gives that share of the experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runShareTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {[TestItemGrowthLevels.SHARE_KEY]: TestItemGrowthLevels.HALF_SHARE},
                    [],
                    2 * TestItemGrowthLevels.EXTRA_EXPERIENCE,
                    TestItemGrowthLevels.EXTRA_EXPERIENCE
                );
            });
            test('experience share 0 gives no experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runShareTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {[TestItemGrowthLevels.SHARE_KEY]: 0},
                    [],
                    TestItemGrowthLevels.EXTRA_EXPERIENCE,
                    0
                );
            });
            test('experience share missing gives the whole experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runShareTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {},
                    [TestItemGrowthLevels.SHARE_KEY],
                    TestItemGrowthLevels.EXTRA_EXPERIENCE,
                    TestItemGrowthLevels.EXTRA_EXPERIENCE
                );
            });
            test('experience that levels the player and the sword applies both modifiers once', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runPlayerAndItemLevelUpTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipped item that is not growing gets no growth data saved', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthLevels.runNotGrowingItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthLevels.run();
