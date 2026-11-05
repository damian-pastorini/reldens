/**
 *
 * Reldens - Item Details Showcase
 *
 * Opens the details of an item by clicking its image in the inventory or in the equipment panel, checks the details
 * show the expected texts (the stored item label and description, and the item level and modifiers when given) and, in
 * the long run, keeps the details on screen, so the video shows the item before any item action is clicked.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./long-run-showcase');
const { TimeConstants } = require('./time-constants');

class ItemDetailsShowcase
{

    static async loadStoredTexts(gameConfig, itemKey)
    {
        let itemRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: itemKey})].shift();
        expect(itemRow, 'The item '+itemKey+' must be stored').toBeTruthy();
        return [itemRow.label, itemRow.description].filter(storedText => storedText);
    }

    static async showDetails(page, imageSelector, detailsSelector, expectedTexts, longRun)
    {
        await page.locator(imageSelector).click({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        let itemDetails = page.locator(detailsSelector);
        await expect(itemDetails, 'The clicked item must show its details').toBeVisible();
        for(let expectedText of expectedTexts){
            await expect(itemDetails, 'The item details must show: '+expectedText).toContainText(expectedText);
        }
        return await LongRunShowcase.pause(page, longRun);
    }

}

module.exports.ItemDetailsShowcase = ItemDetailsShowcase;
