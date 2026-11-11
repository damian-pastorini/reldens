/**
 *
 * Reldens - Timing Object Session
 *
 * Shared steps of the timing objects specs (chest, mining rocks and fishing spots): enter the forest with its enemies
 * disabled, disable the player in the forest, place the player from the server next to the first instance of an object (its random movement stopped and
 * the player on the closest free walkable tile), read a reward item quantity from the inventory, record the timing
 * messages the server sends to the player (timingStart, timingCancel, timingComplete) and start a timing on the
 * reached instance; prepare a mining (the player next to the first mining rock with the inventory open and the reward
 * quantity read), wait the timing duration and check the reward quantity, and through TimingObjectsProbe change a
 * cancel rule of the object for the group, read its timing state and override the inventory "addItem" of the player.
 *
 */

const { expect, test } = require('@playwright/test');
const { Login } = require('./login');
const { Phaser } = require('./phaser');
const { RoomObjectsApi } = require('./room-objects-api');
const { SecurityApi } = require('./security-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { Navigation } = require('./navigation');
const { ObjectChase } = require('./object-chase');
const { PhaserRange } = require('./phaser-range');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { GameConst } = require('../../../lib/game/constants');
const { sc } = require('@reldens/utils');

class TimingObjectSession
{

    static TIMING_ACTION_PREFIX = 'timing';
    static MINING_TEST_TIMEOUT = 240000;

    static async enterForestWithoutEnemies(page, gameConfig, longRun)
    {
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        expect(
            await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME),
            'The forest enemies must be disabled before using the interactive objects'
        ).toBeGreaterThan(0);
        return forestData;
    }

    static async disableForestPlayer(gameConfig)
    {
        let disabled = await GameplayE2eStateApi.setPlayerState(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName,
            GameConst.STATUS.DISABLED
        );
        expect(disabled.inState, 'The player is disabled: '+disabled.error).toBe(GameConst.STATUS.DISABLED);
    }

    static async placeNextToObject(page, gameConfig, objectAssetKey, timeout, label)
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            objectAssetKey,
            timeout
        );
        expect(placement.reached, 'The player must be placed next to the '+label+': '+sc.toJsonString(placement)).toBe(true);
        return placement.bodyKey;
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
            window.e2eTimingMessages = [];
            let room = window.reldens.activeRoomEvents.room;
            if(room === window.e2eTimingActionsRoom){
                return;
            }
            window.e2eTimingActionsRoom = room;
            room.onMessage('*', (message) => {
                if(message && 'string' === typeof message.act && 0 === message.act.indexOf(actionPrefix)){
                    window.e2eTimingActions.push(message.act);
                    window.e2eTimingMessages.push(Object.assign({}, message));
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

    static async prepareMining(page, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TimingObjectSession.MINING_TEST_TIMEOUT, longRun));
        let rockAssetKey = gameConfig.e2eMiningRockKey || '';
        expect(rockAssetKey, 'e2eMiningRockKey not configured').toBeTruthy();
        let rewardItemId = gameConfig.e2eMiningRockRewardItemId || '';
        expect(rewardItemId, 'e2eMiningRockRewardItemId must be configured').toBeTruthy();
        let forestData = await TimingObjectSession.enterForestWithoutEnemies(page, gameConfig, longRun);
        let rockKey = await TimingObjectSession.placeNextToObject(
            page,
            gameConfig,
            rockAssetKey,
            forestData.sceneTimeout,
            'mining rock'
        );
        await TimingObjectSession.openInventory(page, forestData.pauseMs);
        return {
            rockKey,
            rewardItemId,
            rewardQtyBefore: await TimingObjectSession.fetchInventoryItemQty(page, rewardItemId),
            serverTimeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        };
    }

    static async sideStep(page)
    {
        let position = await Phaser.getPlayerServerPosition(page);
        let walkableOffsets = await PhaserRange.filterWalkableOffsets(
            page,
            position.x,
            position.y,
            ObjectChase.SIDESTEP_OFFSETS,
            Navigation.TILE_SIZE
        );
        expect(walkableOffsets.length, 'A walkable tile next to '+position.x+','+position.y+' must exist')
            .toBeGreaterThan(0);
        let sideStepPoint = ObjectChase.offsetPoint(position.x, position.y, [...walkableOffsets].shift());
        await Navigation.moveToWorldPoint(page, sideStepPoint.x, sideStepPoint.y);
        return sideStepPoint;
    }

    static async fetchRecordedActions(page)
    {
        return await page.evaluate(() => [...(window.e2eTimingActions || [])]);
    }

    static async fetchRecordedMessages(page)
    {
        return await page.evaluate(() => [...(window.e2eTimingMessages || [])]);
    }

    static async changeObjectProperty(gameConfig, group, objectKey, propertyKey, value)
    {
        let changed = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/timing-objects/object-property', {
            roomName: Login.FOREST_ROOM_NAME,
            group,
            objectKey,
            propertyKey,
            value
        });
        expect(changed.value, 'The '+propertyKey+' of '+objectKey+' must change: '+changed.error).toEqual(value);
        return changed;
    }

    static async holdTimingStop(gameConfig, group, objectKey)
    {
        let held = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/timing-objects/hold-stop', {
            roomName: Login.FOREST_ROOM_NAME,
            group,
            objectKey
        });
        expect(held.isStopHeld, 'The stop of '+objectKey+' must be held: '+held.error).toBe(true);
    }

    static async fetchTimingState(gameConfig, objectKey)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/timing-objects/state?'+new URLSearchParams({roomName: Login.FOREST_ROOM_NAME, objectKey}).toString()
        );
    }

    static async overrideInventoryMethod(gameConfig, group, methodKey, behavior)
    {
        let overridden = await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/timing-objects/inventory-method-override',
            Object.assign({roomName: Login.FOREST_ROOM_NAME, group, playerName: gameConfig.e2ePlayerName, methodKey}, behavior)
        );
        expect(overridden.methodKey, 'The inventory '+methodKey+' must be overridden: '+overridden.error).toBe(methodKey);
        return overridden;
    }

    static async expectRewardAfterDuration(page, mining, expectedQty, message)
    {
        await page.waitForTimeout(
            await TimingObjectSession.fetchTimingDuration(page, mining.rockKey) + TimeConstants.ACTION
        );
        await expect.poll(
            async () => await TimingObjectSession.fetchInventoryItemQty(page, mining.rewardItemId),
            {message, timeout: mining.serverTimeout}
        ).toBe(expectedQty);
    }

}

module.exports.TimingObjectSession = TimingObjectSession;
