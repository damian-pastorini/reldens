/**
 *
 * Reldens - Test Items Scenes
 *
 * Tests the player items across the server rooms and the server items data (exclusive group, the overrides restored by
 * the group reset): the axe equipped in the town stays equipped after walking to the forest through the change point,
 * with its modifier applied once and its box in the group slot; and a server with no items or with no item groups
 * (the loaded inventory data emptied for the group) creates no inventory or no equipment panel on the next login.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemsSteps } = require('./helpers/items-steps');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemsScenes
{

    static INVENTORY_CONFIG_PATH = 'inventory/package/config/inventory';

    static async runSceneChangeTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + 2 * TimeConstants.NAVIGATION, context.longRun));
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        let player = {page: context.page, playerName: gameConfig.e2ePlayerName};
        let atk = await ItemsSteps.fetchAttackBonus(context, player, gameConfig.e2eEquipableItemId);
        let axeId = await ItemsSteps.equipAxe(context, player);
        await Login.moveThroughChangePoint(context.page, gameConfig, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchItems(gameConfig, gameConfig.e2ePlayerName)).filter(
                item => axeId === item.inventoryId
            ).map(item => item.equipped),
            {message: 'The axe stays equipped in the forest', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([true]);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName)).stats.atk,
            'The axe modifier is applied once after the scene change'
        ).toBe(atk.base + atk.bonus);
        let groupKey = await ItemsSteps.fetchGroupKey(gameConfig, gameConfig.e2eEquipableItemId);
        await expect(
            context.page.locator(Selectors.equipment.slotById(groupKey)+' .equipped-item #item-'+axeId),
            'The axe is in its group slot in the forest'
        ).toHaveCount(1);
    }

    static async runEmptyInventoryDataTest(context, featurePath, propertyKey, emptyValue, missingPanel, keptPanel)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let changed = await GameplayE2eStateApi.changeFeatureProperty(
            context.gameConfig,
            context.e2eGroup,
            featurePath,
            propertyKey,
            emptyValue
        );
        expect(changed.error, 'The loaded inventory data is emptied').toBeUndefined();
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun, '', true);
        await expect(context.page.locator(keptPanel), 'The other panel is created').toHaveCount(1);
        await expect(context.page.locator(missingPanel), 'No panel without its data').toHaveCount(0);
    }

    static run()
    {
        test.describe('Items Scenes', () => {
            test('equipped axe keeps its modifier once after a scene change', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsScenes.runSceneChangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('server with no items creates no inventory panel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsScenes.runEmptyInventoryDataTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    TestItemsScenes.INVENTORY_CONFIG_PATH,
                    'items',
                    {},
                    Selectors.hud.inventoryOpen,
                    Selectors.hud.equipmentOpen
                );
            });
            test('server with no item groups creates no equipment panel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsScenes.runEmptyInventoryDataTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    TestItemsScenes.INVENTORY_CONFIG_PATH+'/groups',
                    'groupModels',
                    [],
                    Selectors.hud.equipmentOpen,
                    Selectors.hud.inventoryOpen
                );
            });
        });
    }

}

TestItemsScenes.run();
