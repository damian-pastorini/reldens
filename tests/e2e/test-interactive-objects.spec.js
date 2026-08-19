/**
 *
 * Reldens - Test Interactive Objects
 *
 * Tests chest and mining rock interactions.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjects
{
    static FOREST_TRANSITION_X = 608;
    static FOREST_TRANSITION_Y = 16;
    static INTERACTION_RANGE = 120;
    static MINING_ROCK_INTERACTION_RANGE = 120;

    static async loginAndEnterForest(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, 'reldens-forest');
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        let inForest = await Navigation.ensureInRoom(
            page,
            'reldens-forest',
            TestInteractiveObjects.FOREST_TRANSITION_X,
            TestInteractiveObjects.FOREST_TRANSITION_Y,
            navTimeout
        );
        expect(inForest, 'Player must reach reldens-forest').toBeTruthy();
        return { pauseMs, sceneTimeout, navTimeout };
    }

    static async waitForObjectInScene(page, objectKey, timeout)
    {
        let found = await Phaser.waitForObjectByAssetKey(page, objectKey, timeout).then(() => true).catch(() => false);
        if(!found){
            await Phaser.waitForObject(page, objectKey, timeout);
        }
    }

    static async navigateToObjectAndAssertInRange(page, objectKey, forestData, label, range = null)
    {
        let interactionRange = range !== null ? range : TestInteractiveObjects.INTERACTION_RANGE;
        let reached = await Navigation.moveToObjectWithinRange(
            page,
            'asset_key',
            objectKey,
            'visible',
            interactionRange,
            forestData.navTimeout
        );
        if(!reached){
            reached = await Navigation.moveToObjectWithinRange(
                page,
                'asset_key',
                objectKey,
                'active',
                interactionRange,
                forestData.navTimeout
            );
        }
        expect(reached, 'Player must reach '+label+' within interaction range').toBeTruthy();
    }

    static async clickObjectByAssetKeyOrKey(page, objectKey)
    {
        let triggered = await Phaser.triggerObjectInteraction(page, objectKey);
        if(triggered) {
            return;
        }
        let matchMode = await page.evaluate((key) => {
            if(!window.reldens || !window.reldens.activeRoomEvents){
                return 'assetKey';
            }
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.objectsAnimations){
                return 'assetKey';
            }
            if(scene.objectsAnimations[key]){
                return 'key';
            }
            return 'assetKey';
        }, objectKey);
        if('key' === matchMode){
            await Phaser.clickObject(page, objectKey);
            return;
        }
        await Phaser.clickObjectByAssetKey(page, objectKey);
    }

    static async waitForNpcDialogue(page, selector, timeout)
    {
        return page.waitForFunction(
            (sel) => {
                let elements = document.querySelectorAll(sel);
                for(let i = 0; i < elements.length; i++){
                    if('block' === elements[i].style.display) return true;
                }
                return false;
            },
            selector,
            { timeout }
        ).then(() => true).catch(() => false);
    }

    static run()
    {
        test.describe('Interactive Objects', () => {
            test('player opens chest and receives interaction response', async ({ page, screenshots, gameConfig, longRun }) => {
                test.setTimeout(TimeConstants.forLongRun(60000, longRun));
                let objectKey = gameConfig.e2eChestKey || '';
                expect(objectKey, 'e2eChestKey not configured').toBeTruthy();
                let forestData = await TestInteractiveObjects.loginAndEnterForest(page, gameConfig, longRun);
                await screenshots.capture(page, 'chest-forest-entered');
                await TestInteractiveObjects.waitForObjectInScene(page, objectKey, forestData.sceneTimeout);
                await screenshots.capture(page, 'chest-found-in-scene');
                await TestInteractiveObjects.navigateToObjectAndAssertInRange(page, objectKey, forestData, 'chest');
                await screenshots.capture(page, 'chest-player-in-range');
                await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, objectKey);
                await page.waitForTimeout(2000 + forestData.pauseMs);
                await screenshots.capture(page, 'chest-interaction-complete');
                let npcTimeout = TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun);
                let dialogVisible = await TestInteractiveObjects.waitForNpcDialogue(
                    page,
                    Selectors.npc.dialogue,
                    npcTimeout
                );
                expect(dialogVisible, 'NPC dialogue box must be visible after chest interaction').toBeTruthy();
                await screenshots.capture(page, 'chest-dialog-visible');
            });
            test('player mines rock and receives items', async ({ page, screenshots, gameConfig, longRun }) => {
                test.setTimeout(TimeConstants.forLongRun(60000, longRun));
                let objectKey = gameConfig.e2eMiningRockKey || '';
                expect(objectKey, 'e2eMiningRockKey not configured').toBeTruthy();
                let rewardItemId = gameConfig.e2eMiningRockRewardItemId || '';
                expect(rewardItemId, 'e2eMiningRockRewardItemId must be configured').toBeTruthy();
                let forestData = await TestInteractiveObjects.loginAndEnterForest(page, gameConfig, longRun);
                await screenshots.capture(page, 'mining-rock-forest-entered');
                await TestInteractiveObjects.waitForObjectInScene(page, objectKey, forestData.sceneTimeout);
                await screenshots.capture(page, 'mining-rock-found-in-scene');
                await TestInteractiveObjects.navigateToObjectAndAssertInRange(page, objectKey, forestData, 'mining rock', TestInteractiveObjects.MINING_ROCK_INTERACTION_RANGE);
                await page.click(Selectors.hud.inventoryOpen);
                await page.waitForTimeout(forestData.pauseMs);
                await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
                let rewardQtyBefore = 0;
                let rewardExistsBefore = await page.locator(Selectors.inventory.item(rewardItemId)).count();
                if(rewardExistsBefore){
                    let qtyText = await page.locator(Selectors.inventory.itemQty(rewardItemId)).textContent();
                    rewardQtyBefore = Number(qtyText) || 1;
                }
                await screenshots.capture(page, 'mining-rock-inventory-before');
                await page.waitForTimeout(forestData.pauseMs);
                await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, objectKey);
                await page.waitForTimeout(7000 + forestData.pauseMs);
                await screenshots.capture(page, 'mining-rock-interaction-complete');
                let rewardQtyAfter = 0;
                let rewardExistsAfter = await page.locator(Selectors.inventory.item(rewardItemId)).count();
                if(rewardExistsAfter){
                    let qtyText = await page.locator(Selectors.inventory.itemQty(rewardItemId)).textContent();
                    rewardQtyAfter = Number(qtyText) || 1;
                }
                expect(rewardQtyAfter, 'Reward item quantity must increase after mining').toBeGreaterThan(rewardQtyBefore);
                await screenshots.capture(page, 'mining-rock-inventory-after');
            });
        });
    }
}

TestInteractiveObjects.run();
