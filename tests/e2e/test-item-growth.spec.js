/**
 *
 * Reldens - Test Item Growth
 *
 * Tests the item growth: the growing sword (seeded in the player inventory for the test) is equipped from the inventory
 * panel, a Tree placed next to the player with one hit point is killed, and the experience of the kill reaches the
 * sword instance, stored in its items_inventory customData with the level the stored growth levels give, while the
 * player attack grows by the sword modifier scaled to that level. The expected values come from the stored item rows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ItemGrowthCalculator } = require('../../lib/inventory/server/item-growth-calculator');
const { InventoryConst } = require('../../lib/inventory/constants');
const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowth
{

    static ITEM_KEY = 'growing_sword';

    static async loadGrowingItemData(gameConfig)
    {
        let itemRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: TestItemGrowth.ITEM_KEY})]
            .shift();
        expect(itemRow, 'The growing item must be stored').toBeTruthy();
        let modifierRow = [...await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'itemsItemModifiers',
            {item_id: itemRow.id}
        )].shift();
        expect(modifierRow, 'The growing item must have a modifier').toBeTruthy();
        expect(Number(modifierRow.operation), 'The growing item modifier must increase its stat').toBe(
            ModifierConst.OPS.INC
        );
        return {growth: sc.toJson(itemRow.customData, {}).growth, modifierRow};
    }

    static async fetchStat(gameConfig, playerName, statKey)
    {
        return Number(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName)).stats[statKey]
        );
    }

    static async fetchItemGrowth(gameConfig, playerName)
    {
        return sc.get(
            sc.toJson(
                sc.get(
                    [...await E2eSeedAndRestoreApi.loadInventoryRows(gameConfig, playerName, TestItemGrowth.ITEM_KEY)]
                        .shift(),
                    'customData',
                    ''
                ),
                {}
            ),
            'growth',
            {}
        );
    }

    static async equipFromInventory(page, longRun)
    {
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        await page.locator(Selectors.inventory.itemImage(TestItemGrowth.ITEM_KEY)).click({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        let equipButton = page.locator(Selectors.inventory.itemEquip(TestItemGrowth.ITEM_KEY));
        await expect(equipButton).toBeVisible();
        await equipButton.click();
    }

    static async runItemGrowthTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
        );
        let playerName = gameConfig.e2ePlayerName;
        let itemData = await TestItemGrowth.loadGrowingItemData(gameConfig);
        let statKey = [...itemData.modifierRow.property_key.split('/')].pop();
        let modifierValue = Number(itemData.modifierRow.value);
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, e2eGroup, playerName, TestItemGrowth.ITEM_KEY, 1);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let statBefore = await TestItemGrowth.fetchStat(gameConfig, playerName, statKey);
        await TestItemGrowth.equipFromInventory(page, longRun);
        await expect.poll(
            async () => await TestItemGrowth.fetchStat(gameConfig, playerName, statKey),
            {message: 'The equipped sword must apply its modifier'}
        ).toBe(statBefore + modifierValue);
        await screenshots.capture(page, 'growing-sword-equipped');
        let placement = await ForestEnemyKill.placeOneHitEnemy(page, gameConfig, forestData.sceneTimeout);
        let expectedExperience = ItemGrowthCalculator.experienceFor(
            itemData.growth.experienceShare,
            placement.experience
        );
        expect(expectedExperience, 'The kill must give experience to the sword').toBeGreaterThan(0);
        let expectedLevel = ItemGrowthCalculator.levelFor(
            expectedExperience,
            itemData.growth.levels,
            InventoryConst.GROWTH.DEFAULT_LEVEL
        );
        let experienceReached = await RoomObjectsApi.attackTargetUntil(
            page,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => expectedExperience === Number(
                sc.get(await TestItemGrowth.fetchItemGrowth(gameConfig, playerName), 'experience', 0)
            ),
            TimeConstants.ENEMY_KILL
        );
        expect(experienceReached, 'The sword instance must store the kill experience').toBe(true);
        expect(await TestItemGrowth.fetchItemGrowth(gameConfig, playerName)).toEqual({
            level: expectedLevel,
            experience: expectedExperience
        });
        let expectedModifierValue = ItemGrowthCalculator.scaledValue(
            modifierValue,
            expectedLevel,
            itemData.growth.modifiersIncreasePercentPerLevel
        );
        await expect.poll(
            async () => await TestItemGrowth.fetchStat(gameConfig, playerName, statKey),
            {message: 'The equipped sword modifier must grow with its level'}
        ).toBe(statBefore + expectedModifierValue);
        await screenshots.capture(page, 'growing-sword-level-reached');
    }

    static run()
    {
        test.describe('Item Growth', () => {
            test('equipped growing item gains the kill experience and its level modifiers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowth.runItemGrowthTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestItemGrowth.run();
