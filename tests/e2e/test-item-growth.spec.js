/**
 *
 * Reldens - Test Item Growth
 *
 * Tests the item growth: the growing sword (seeded in the player inventory for the test) is equipped from the inventory
 * panel, a Tree placed next to the player (ForestEnemyKill) is killed, and the experience of the kill reaches the
 * sword instance, stored in its items_inventory customData with the level the stored growth levels give, while the
 * player attack grows by the sword modifier scaled to that level. The sword details (ItemDetailsShowcase) show its
 * stored label and description, its level and its modifier before the equip, in the equipment slot after the equip, and
 * in the equipment slot with the reached level and the scaled modifier after the level up, and the chat shows the
 * translated level reached message. The expected values come from the stored item rows and the inventory snippets.
 * The Tree is placed before the long run recording starts, and the long run shows the attack value in the player stats
 * panel before the equip, the sword details, the attack after the equip and after the level up.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { ItemDetailsShowcase } = require('./helpers/item-details-showcase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ResolveOperation } = require('../../lib/inventory/server/resolve-operation');
const InventoryTranslations = require('../../lib/inventory/client/snippets/en_US');
const { ItemGrowthCalculator, ItemsConst } = require('@reldens/items-system');
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
        return {growth: sc.toJson(itemRow.customData, {}).growth, modifierRow, label: itemRow.label};
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

    static async showStatValue(page, statKey, statValue, longRun)
    {
        return await LongRunShowcase.showWhen(
            page,
            async () => statValue === Number(
                [...(await page.locator(Selectors.stats.valueByKey(statKey)).innerText()).split('/')].shift()
            ),
            'The player stats panel must show the '+statKey+' value '+statValue,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun),
            longRun
        );
    }

    static createLevelDetails(statKey, modifierOperation, level, modifierValue)
    {
        return [
            InventoryTranslations.items.growth.level.replace('%level', level),
            ResolveOperation.prefix(modifierOperation)+modifierValue+ResolveOperation.suffix(modifierOperation)
                +' '+statKey
        ];
    }

    static async equipFromInventory(page, gameConfig, levelDetails, longRun)
    {
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        await ItemDetailsShowcase.showDetails(
            page,
            Selectors.inventory.itemImage(TestItemGrowth.ITEM_KEY),
            Selectors.inventory.itemDetails(TestItemGrowth.ITEM_KEY),
            [...await ItemDetailsShowcase.loadStoredTexts(gameConfig, TestItemGrowth.ITEM_KEY), ...levelDetails],
            longRun
        );
        let equipButton = page.locator(Selectors.inventory.itemEquip(TestItemGrowth.ITEM_KEY));
        await expect(equipButton).toBeVisible();
        await equipButton.click();
        await page.click(Selectors.hud.inventoryClose);
    }

    static async showEquippedItemDetails(page, levelDetails, longRun)
    {
        await page.click(Selectors.hud.equipmentOpen);
        await expect(page.locator(Selectors.equipment.ui)).toBeVisible();
        await ItemDetailsShowcase.showDetails(
            page,
            Selectors.equipment.itemImage(TestItemGrowth.ITEM_KEY),
            Selectors.equipment.itemDetails(TestItemGrowth.ITEM_KEY),
            levelDetails,
            longRun
        );
        await page.click(Selectors.hud.equipmentClose);
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
        let modifierOperation = Number(itemData.modifierRow.operation);
        let firstLevelDetails = TestItemGrowth.createLevelDetails(
            statKey,
            modifierOperation,
            ItemsConst.GROWTH.DEFAULT_LEVEL,
            modifierValue
        );
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, e2eGroup, playerName, TestItemGrowth.ITEM_KEY, 1);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let placement = await ForestEnemyKill.placeEnemyToKill(page, gameConfig, forestData.sceneTimeout, longRun);
        await LongRunShowcase.startGameplayRecording(page, longRun);
        let statBefore = await TestItemGrowth.fetchStat(gameConfig, playerName, statKey);
        await LongRunShowcase.openPanel(page, Selectors.hud.playerStatsOpen, Selectors.hud.playerStatsUi, longRun);
        await TestItemGrowth.showStatValue(page, statKey, statBefore, longRun);
        await TestItemGrowth.equipFromInventory(page, gameConfig, firstLevelDetails, longRun);
        await expect.poll(
            async () => await TestItemGrowth.fetchStat(gameConfig, playerName, statKey),
            {message: 'The equipped sword must apply its modifier'}
        ).toBe(statBefore + modifierValue);
        await TestItemGrowth.showEquippedItemDetails(page, firstLevelDetails, longRun);
        await TestItemGrowth.showStatValue(page, statKey, statBefore + modifierValue, longRun);
        await screenshots.capture(page, 'growing-sword-equipped');
        await LongRunShowcase.openPanel(page, Selectors.hud.chatOpen, Selectors.chat.input, longRun);
        let expectedExperience = ItemGrowthCalculator.experienceFor(
            itemData.growth.experienceShare,
            placement.experience
        );
        expect(expectedExperience, 'The kill must give experience to the sword').toBeGreaterThan(0);
        let expectedLevel = ItemGrowthCalculator.levelFor(
            expectedExperience,
            itemData.growth.levels,
            ItemsConst.GROWTH.DEFAULT_LEVEL
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
        await expect(
            page.locator(Selectors.chat.tabContentGeneral),
            'The chat must show the translated level reached by the sword'
        ).toContainText(
            InventoryTranslations.items.growth.reachedLevel
                .replace('%itemLabel', itemData.label)
                .replace('%level', expectedLevel),
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await LongRunShowcase.pause(page, longRun);
        await TestItemGrowth.showStatValue(page, statKey, statBefore + expectedModifierValue, longRun);
        await TestItemGrowth.showEquippedItemDetails(
            page,
            TestItemGrowth.createLevelDetails(statKey, modifierOperation, expectedLevel, expectedModifierValue),
            longRun
        );
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
