/**
 *
 * Reldens - Test Item Growth Display
 *
 * Tests the growing items texts (ItemGrowthSteps: the sword seeded in the player inventory and equipped in the forest):
 * the details of an item that is not growing (the configured equipable item the player carries) show no level line;
 * and with the user locale set to the stored es_ES locale for the group, the level reached chat message and the sword
 * details level line use the stored es_ES snippets.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { ItemDetailsShowcase } = require('./helpers/item-details-showcase');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { InventoryConst } = require('../../lib/inventory/constants');
const InventoryTranslations = require('../../lib/inventory/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthDisplay
{

    static SECOND_LEVEL = 2;
    static TRANSLATED_LOCALE = 'es_ES';
    static LEVEL_PLACEHOLDER = '%level';

    static async setTranslatedLocale(context)
    {
        let gameConfig = context.gameConfig;
        let userFilter = {user_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'users', {username: gameConfig.e2eUsername})};
        let localeId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'locale', {locale: TestItemGrowthDisplay.TRANSLATED_LOCALE});
        let storedRows = await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'usersLocale', userFilter);
        await (0 === storedRows.length
            ? E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'usersLocale', Object.assign({locale_id: localeId}, userFilter))
            : E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'usersLocale', userFilter, {locale_id: localeId}));
        let snippets = {};
        for(let snippetKey of [InventoryConst.SNIPPETS.ITEM_LEVEL, InventoryConst.SNIPPETS.ITEM_REACHED_LEVEL]){
            let snippetRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'snippets', {locale_id: localeId, key: snippetKey})]
                .shift();
            expect(snippetRow, 'The '+snippetKey+' translation must be stored').toBeTruthy();
            snippets[snippetKey] = snippetRow.value;
        }
        return snippets;
    }

    static async runNotGrowingItemTest(context)
    {
        let itemKey = context.gameConfig.e2eEquipableItemId;
        await ItemGrowthSteps.startGrowth(context);
        let item = (await ItemGrowthSteps.fetchItems(context.gameConfig, context.gameConfig.e2ePlayerName)).find(
            inventoryItem => itemKey === inventoryItem.key
        );
        expect(item, 'The player must carry the not growing item').toBeTruthy();
        await ItemGrowthChecks.showItemDetails(
            context.page,
            item.equipped,
            await ItemDetailsShowcase.loadStoredTexts(context.gameConfig, itemKey),
            context.longRun,
            itemKey
        );
        await expect(
            context.page.locator(Selectors[item.equipped ? 'equipment' : 'inventory'].itemDetails(itemKey)),
            'The not growing item shows no level line'
        ).not.toContainText(
            InventoryTranslations.items.growth.level.split(TestItemGrowthDisplay.LEVEL_PLACEHOLDER).shift().trim()
        );
    }

    static async runTranslatedLevelMessageTest(context)
    {
        let snippets = await TestItemGrowthDisplay.setTranslatedLocale(context);
        let started = await ItemGrowthSteps.startGrowth(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthDisplay.SECOND_LEVEL);
        await ItemGrowthSteps.gainExperience(context, threshold, {level: TestItemGrowthDisplay.SECOND_LEVEL, experience: threshold});
        await expect(
            context.page.locator(Selectors.chat.tabContentGeneral),
            'The chat shows the stored level reached translation'
        ).toContainText(
            snippets[InventoryConst.SNIPPETS.ITEM_REACHED_LEVEL]
                .replace('%itemLabel', started.itemData.label)
                .replace(TestItemGrowthDisplay.LEVEL_PLACEHOLDER, TestItemGrowthDisplay.SECOND_LEVEL),
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, context.longRun)}
        );
    }

    static async runTranslatedDetailsTest(context)
    {
        let snippets = await TestItemGrowthDisplay.setTranslatedLocale(context);
        await ItemGrowthSteps.startGrowth(context);
        await ItemGrowthChecks.showItemDetails(
            context.page,
            true,
            [snippets[InventoryConst.SNIPPETS.ITEM_LEVEL].replace(TestItemGrowthDisplay.LEVEL_PLACEHOLDER, 1)],
            context.longRun
        );
    }

    static run()
    {
        test.describe('Item Growth Display', () => {
            test('item that is not growing shows no level line in its details', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthDisplay.runNotGrowingItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('level reached chat message uses the stored translation of the user locale', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthDisplay.runTranslatedLevelMessageTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('sword details level line uses the stored translation of the user locale', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthDisplay.runTranslatedDetailsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthDisplay.run();
