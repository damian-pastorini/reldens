/**
 *
 * Reldens - Test Item Growth Equipment
 *
 * Tests the growing sword equip state around its level up (ItemGrowthSteps: the sword seeded in the player inventory
 * and equipped in the forest, the level reached with experience added to the player class path): the level up with the
 * equipment panel open keeps one sword box, in the equipment slot, showing the reached level; the level up of a
 * modifier on a lowered stat (the life, a sword modifier seeded for the group) keeps the lowered value plus the scaled
 * difference, never refilled or lost; equipping the spear of the same group unequips the sword and the sword stops
 * growing; and the unequip sent while the level up is running (its level reached listener delayed) ends with the
 * sword unequipped and the stat without the sword modifier.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { InventoryConst } = require('../../lib/inventory/constants');
const InventoryTranslations = require('../../lib/inventory/client/snippets/en_US');
const { ItemGrowthCalculator } = require('@reldens/items-system');
const { ModifierConst } = require('@reldens/modifiers');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthEquipment
{

    static SECOND_LEVEL = 2;
    static SAME_GROUP_ITEM_KEY = 'spear';
    static LIFE_KEY = 'hp';
    static LOWERED_LIFE = 40;
    static LISTENER_DELAY_MS = 1500;
    static LIFE_MODIFIER = {key: 'e2e_growth_life', propertyKey: 'stats/hp', operation: ModifierConst.OPS.INC, value: '10'};

    static async runPanelOpenTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthEquipment.SECOND_LEVEL);
        await context.page.click(Selectors.hud.equipmentOpen);
        await expect(context.page.locator(Selectors.equipment.ui)).toBeVisible();
        await ItemGrowthSteps.gainExperience(context, threshold, {level: TestItemGrowthEquipment.SECOND_LEVEL, experience: threshold});
        let itemKey = ItemGrowthSteps.ITEM_KEY;
        await expect.poll(
            async () => [
                await context.page.locator(Selectors.equipment.itemImage(itemKey)).count(),
                await context.page.locator(Selectors.inventory.itemImage(itemKey)).count(),
                await context.page.locator('#item-'+started.item.inventoryId).count()
            ],
            {message: 'One sword box stays in the equipment slot', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([1, 0, 1]);
        await expect(
            context.page.locator(Selectors.equipment.itemDetails(itemKey)),
            'The equipment slot box shows the reached level'
        ).toContainText(InventoryTranslations.items.growth.level.replace('%level', TestItemGrowthEquipment.SECOND_LEVEL));
        await context.page.click(Selectors.hud.equipmentClose);
    }

    static async runLoweredStatTest(context)
    {
        await ItemGrowthSteps.seedItemModifiers(context, [TestItemGrowthEquipment.LIFE_MODIFIER]);
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthEquipment.SECOND_LEVEL);
        let lifeKey = TestItemGrowthEquipment.LIFE_KEY;
        let lowered = await GameplayE2eStateApi.setPlayerStats(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            {[lifeKey]: TestItemGrowthEquipment.LOWERED_LIFE}
        );
        expect(lowered.error, 'The life must be lowered').toBeUndefined();
        await ItemGrowthSteps.gainExperience(context, threshold, {level: TestItemGrowthEquipment.SECOND_LEVEL, experience: threshold});
        let modifierValue = Number(TestItemGrowthEquipment.LIFE_MODIFIER.value);
        let scaledValue = ItemGrowthCalculator.scaledValue(
            modifierValue,
            TestItemGrowthEquipment.SECOND_LEVEL,
            started.growth[ItemGrowthChecks.PERCENT_KEY]
        );
        expect(
            (await ItemGrowthSteps.fetchPlayerStats(context.gameConfig))[lifeKey],
            'The lowered life only gets the scaled difference'
        ).toBe(TestItemGrowthEquipment.LOWERED_LIFE - modifierValue + scaledValue);
    }

    static async runSameGroupItemTest(context)
    {
        let playerName = context.gameConfig.e2ePlayerName;
        await E2eSeedAndRestoreApi.seedInventoryItem(
            context.gameConfig,
            context.e2eGroup,
            playerName,
            TestItemGrowthEquipment.SAME_GROUP_ITEM_KEY,
            1
        );
        let started = await ItemGrowthSteps.startGrowth(context);
        let sameGroupItem = (await ItemGrowthSteps.fetchItems(context.gameConfig, playerName)).find(
            item => TestItemGrowthEquipment.SAME_GROUP_ITEM_KEY === item.key
        );
        expect(sameGroupItem, 'The player must carry the spear').toBeTruthy();
        await ItemGrowthSteps.toggleEquip(context.page, context.gameConfig, sameGroupItem, true);
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchGrowingItem(context.gameConfig, playerName)).equipped,
            {message: 'The spear unequips the sword', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(false);
        await ItemGrowthSteps.addExperience(
            context.gameConfig,
            playerName,
            ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthEquipment.SECOND_LEVEL)
        );
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(await ItemGrowthSteps.fetchItemGrowth(context.gameConfig, playerName), 'The unequipped sword stops growing')
            .toEqual({});
    }

    static async runUnequipDuringLevelUpTest(context)
    {
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthEquipment.SECOND_LEVEL);
        await ItemGrowthSteps.overrideGrowthApplier(context, 'applyReachedLevel', {
            delayMs: TestItemGrowthEquipment.LISTENER_DELAY_MS
        });
        let addedExperience = ItemGrowthSteps.addExperience(context.gameConfig, context.gameConfig.e2ePlayerName, threshold);
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchCalls(context, ItemGrowthSteps.APPLIER_CALLS_KEY, 'applyReachedLevel')).called,
            {message: 'The level up must be running', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await RoomMessagesRecorder.sendMessage(context.page, {act: InventoryConst.ACTIONS.EQUIP, 'idx': started.item.inventoryId});
        await addedExperience;
        let item = await ItemGrowthSteps.waitForStoredGrowth(context, {
            level: TestItemGrowthEquipment.SECOND_LEVEL,
            experience: threshold
        });
        expect(item.growthLevel, 'The level up running during the unequip still reaches the level').toBe(
            TestItemGrowthEquipment.SECOND_LEVEL
        );
    }

    static run()
    {
        test.describe('Item Growth Equipment', () => {
            test('level up with the equipment panel open keeps one sword box in the slot', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthEquipment.runPanelOpenTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('level up of a modifier on a lowered stat keeps the lowered value', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthEquipment.runLoweredStatTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipping another item of the same group unequips the sword and it stops growing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthEquipment.runSameGroupItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unequip sent during the level up ends unequipped with no sword modifier', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthEquipment.runUnequipDuringLevelUpTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthEquipment.run();
