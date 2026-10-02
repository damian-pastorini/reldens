/**
 *
 * Reldens - Timing Object Session
 *
 * Shared steps of the timing objects specs (chest, mining rocks and fishing spots): enter the forest with its enemies
 * disabled, reach the closest instance of an object, read a reward item quantity from the inventory, record the timing
 * messages the server sends to the player (timingStart, timingCancel, timingComplete) and start a timing on the
 * reached instance.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { ObjectChase } = require('./object-chase');
const { Phaser } = require('./phaser');
const { RoomObjectsApi } = require('./room-objects-api');
const { Selectors } = require('../selectors');

class TimingObjectSession
{

    static TIMING_ACTION_PREFIX = 'timing';

    static async enterForestWithoutEnemies(page, gameConfig, longRun)
    {
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        expect(
            await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME),
            'The forest enemies must be disabled before using the interactive objects'
        ).toBeGreaterThan(0);
        return forestData;
    }

    static async reachObject(page, objectKey, navTimeout, label, range)
    {
        let reachedKey = await ObjectChase.moveToObjectWithinRange(
            page,
            'asset_key',
            objectKey,
            'visible',
            range,
            navTimeout
        );
        if(!reachedKey){
            reachedKey = await ObjectChase.moveToObjectWithinRange(
                page,
                'asset_key',
                objectKey,
                'active',
                range,
                navTimeout
            );
        }
        expect(reachedKey, 'Player must reach '+label+' within interaction range').toBeTruthy();
        return reachedKey;
    }

    static async fetchInventoryItemQty(page, itemKey)
    {
        let quantities = await page.locator(Selectors.inventory.itemQty(itemKey)).allTextContents();
        let totalQty = 0;
        for(let quantity of quantities){
            totalQty += Number(quantity) || 1;
        }
        return totalQty;
    }

    static async openInventory(page, pauseMs)
    {
        await page.click(Selectors.hud.inventoryOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
    }

    static async recordTimingActions(page)
    {
        await page.evaluate((actionPrefix) => {
            window.e2eTimingActions = [];
            window.reldens.activeRoomEvents.room.onMessage('*', (message) => {
                if(message && 'string' === typeof message.act && 0 === message.act.indexOf(actionPrefix)){
                    window.e2eTimingActions.push(message.act);
                }
            });
        }, TimingObjectSession.TIMING_ACTION_PREFIX);
    }

    static async waitForTimingAction(page, timingAction, timeout)
    {
        await page.waitForFunction(
            (expectedAction) => Boolean(window.e2eTimingActions) && window.e2eTimingActions.includes(expectedAction),
            timingAction,
            {timeout}
        );
    }

    static async fetchTimingDuration(page, objectKey)
    {
        return page.evaluate(
            (key) => Number(window.reldens.getActiveScene().objectsAnimations[key].clientParams.timingDuration),
            objectKey
        );
    }

    static async startTiming(page, objectKey, timeout)
    {
        await TimingObjectSession.recordTimingActions(page);
        expect(
            await Phaser.triggerObjectInteraction(page, objectKey),
            'The interaction with '+objectKey+' must be sent'
        ).toBeTruthy();
        await TimingObjectSession.waitForTimingAction(page, 'timingStart', timeout);
    }

}

module.exports.TimingObjectSession = TimingObjectSession;
