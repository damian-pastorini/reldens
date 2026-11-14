/**
 *
 * Reldens - Item Growth Checks
 *
 * The checks of the item growth specs: the experience required by a level of the growth configuration, the live sword
 * on a level (equipped or not, its growth level and its modifier scaled to that level) with the player stat holding
 * that modifier once (or none when the sword is unequipped), the level reached messages received by the owner, and the
 * sword level and modifier texts shown in the inventory or equipment panel details.
 *
 */

const { expect } = require('@playwright/test');
const { ItemGrowthSteps } = require('./item-growth-steps');
const { ItemDetailsShowcase } = require('./item-details-showcase');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { ResolveOperation } = require('../../../lib/inventory/server/resolve-operation');
const InventoryTranslations = require('../../../lib/inventory/client/snippets/en_US');
const { ItemGrowthCalculator } = require('@reldens/items-system');

class ItemGrowthChecks
{

    static PERCENT_KEY = 'modifiersIncreasePercentPerLevel';

    static levelThreshold(growth, level)
    {
        let threshold = Number(growth.levels[String(level)]);
        expect(threshold, 'The growth must have the level '+level+' threshold').toBeGreaterThan(0);
        return threshold;
    }

    static async expectItemOnLevel(context, started, item, level, isEquipped = true, roomName = Login.FOREST_ROOM_NAME)
    {
        let modifierRow = started.itemData.modifierRow;
        let scaledValue = ItemGrowthCalculator.scaledValue(
            modifierRow.value,
            level,
            started.growth[ItemGrowthChecks.PERCENT_KEY]
        );
        expect(
            [item.equipped, item.growthLevel, item.modifiers.find(modifier => modifierRow.key === modifier.key)?.value],
            'The sword equipped state, level and modifier on the level '+level
        ).toEqual([isEquipped, level, scaledValue]);
        let statKey = started.itemData.statKey;
        expect(
            (await ItemGrowthSteps.fetchPlayerStats(context.gameConfig, roomName))[statKey],
            'The stat holds the sword modifier of the level '+level+' once, or none when unequipped'
        ).toBe(started.statsBefore[statKey] - Number(modifierRow.value) + (isEquipped ? scaledValue : 0));
        return scaledValue;
    }

    static async expectLevelMessages(page, count)
    {
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchLevelMessages(page)).length,
            {message: 'The level reached messages must be '+count, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(count);
    }

    static createLevelDetails(statKey, modifierOperation, level, modifierValue)
    {
        return [
            InventoryTranslations.items.growth.level.replace('%level', level),
            ResolveOperation.prefix(modifierOperation)+modifierValue+ResolveOperation.suffix(modifierOperation)
                +' '+statKey
        ];
    }

    static async showLevelDetails(context, started, level, isEquipped = true)
    {
        let modifierRow = started.itemData.modifierRow;
        await ItemGrowthChecks.showItemDetails(
            context.page,
            isEquipped,
            ItemGrowthChecks.createLevelDetails(
                started.itemData.statKey,
                Number(modifierRow.operation),
                level,
                ItemGrowthCalculator.scaledValue(modifierRow.value, level, started.growth[ItemGrowthChecks.PERCENT_KEY])
            ),
            context.longRun
        );
    }

    static async showItemDetails(page, isEquipped, levelDetails, longRun, itemKey = ItemGrowthSteps.ITEM_KEY)
    {
        let panel = isEquipped ? 'equipment' : 'inventory';
        let openButton = page.locator(Selectors.hud[panel+'Open']);
        await expect(openButton, 'The '+panel+' button must be shown').toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
        await openButton.click();
        await expect(page.locator(Selectors[panel].ui)).toBeVisible();
        await ItemDetailsShowcase.showDetails(
            page,
            Selectors[panel].itemImage(itemKey),
            Selectors[panel].itemDetails(itemKey),
            levelDetails,
            longRun
        );
        await page.click(Selectors.hud[panel+'Close']);
    }

}

module.exports.ItemGrowthChecks = ItemGrowthChecks;
