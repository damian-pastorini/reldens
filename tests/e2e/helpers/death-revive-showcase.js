/**
 *
 * Reldens - Death Revive Showcase
 *
 * The steps of the death specs that run only in the long run: the player life lowered before the recording, so the
 * enemy kills it in a few hits, the recording steps that tell the general flow of each case (the HUD shows the life and
 * the panels show the items) and the checks of what the inventory panel shows. The clicks hover the button and wait
 * before clicking it, so the recorded cursor shows them. The normal run skips everything, only clicking the buttons.
 *
 */

const { expect } = require('@playwright/test');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { LongRunShowcase } = require('./long-run-showcase');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');

class DeathReviveShowcase
{

    static PLAYER_LIFE = 10;
    static SHOWN_ITEM_QUANTITY = '1';
    static CLICK_HOLD_MS = 250;
    static CLICK_POSITION = {x: 8, y: 8};

    static async showStep(context, stepText)
    {
        return await LongRunShowcase.showStep(context.page, stepText, context.longRun);
    }

    static async clickButton(context, buttonSelector)
    {
        let page = context.page;
        if(!context.longRun){
            return await page.click(buttonSelector);
        }
        await page.hover(buttonSelector, {position: DeathReviveShowcase.CLICK_POSITION});
        await page.waitForTimeout(TimeConstants.pauseMs(true));
        return await page.click(buttonSelector, {
            position: DeathReviveShowcase.CLICK_POSITION,
            delay: DeathReviveShowcase.CLICK_HOLD_MS
        });
    }

    static async lowerLife(context)
    {
        if(!context.longRun){
            return false;
        }
        await ForestEnemyKill.lowerPlayerLife(context.page, context.gameConfig, DeathReviveShowcase.PLAYER_LIFE);
        return true;
    }

    static async expectShownItem(context, restorationItemKey)
    {
        if(!context.longRun){
            return false;
        }
        await expect(
            context.page.locator(Selectors.inventory.itemQty(restorationItemKey)),
            'The inventory panel must show the restoration item'
        ).toHaveText(DeathReviveShowcase.SHOWN_ITEM_QUANTITY);
        return true;
    }

    static async showRevivedInTown(context)
    {
        await DeathReviveShowcase.showStep(context, 'The player revived in '+context.reviveLabels.townRoom.title);
        return await LongRunShowcase.waitForCamera(context.page, context.longRun);
    }

    static async showKeptItem(context, restorationItemKey)
    {
        if(!context.longRun){
            return false;
        }
        await DeathReviveShowcase.clickButton(context, Selectors.hud.inventoryOpen);
        await expect(context.page.locator(Selectors.inventory.ui)).toBeVisible();
        await DeathReviveShowcase.expectShownItem(context, restorationItemKey);
        await DeathReviveShowcase.showStep(
            context,
            'The '+context.reviveLabels.itemLabel+' was kept: it is still in the inventory'
        );
        return await LongRunShowcase.pause(context.page, true);
    }

}

module.exports.DeathReviveShowcase = DeathReviveShowcase;
