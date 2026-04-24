/**
 *
 * Reldens - Test Interactive Objects
 *
 * Tests chest, fish spawn, and mining rock interactions with inventory verification.
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

    static async loginAndEnterForest(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
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
        return { pauseMs, sceneTimeout };
    }

    static async openInventoryAndCountItems(page, pauseMs)
    {
        await page.click(Selectors.hud.inventoryOpen);
        await page.waitForTimeout(pauseMs);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        return page.locator(Selectors.inventory.items+' > *').count();
    }

    static resolveObjectMatchMode(page, objectKey)
    {
        return page.evaluate((key) => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return 'assetKey';
            }
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.objectsAnimations) {
                return 'assetKey';
            }
            if(scene.objectsAnimations[key]) {
                return 'key';
            }
            return 'assetKey';
        }, objectKey);
    }

    static async waitForObjectFlexible(page, objectKey, timeout)
    {
        try {
            await Phaser.waitForObjectByAssetKey(page, objectKey, timeout);
            return;
        } catch(assetKeyError) {
            await Phaser.waitForObject(page, objectKey, timeout);
        }
    }

    static async clickObjectFlexible(page, objectKey, matchMode)
    {
        if('key' === matchMode) {
            await Phaser.clickObject(page, objectKey);
            return;
        }
        await Phaser.clickObjectByAssetKey(page, objectKey);
    }

    static async runObjectInteractionTest(page, screenshots, gameConfig, longRun, objectKeyProp, capturePrefix, delayMs)
    {
        let objectKey = gameConfig[objectKeyProp] || '';
        test.skip(!objectKey, objectKeyProp+' not configured');
        let ctx = await TestInteractiveObjects.loginAndEnterForest(page, gameConfig, longRun);
        await screenshots.capture(page, capturePrefix+'-forest-entered');
        await TestInteractiveObjects.waitForObjectFlexible(page, objectKey, ctx.sceneTimeout);
        let matchMode = await TestInteractiveObjects.resolveObjectMatchMode(page, objectKey);
        await screenshots.capture(page, capturePrefix+'-found-in-scene');
        let itemsBefore = await TestInteractiveObjects.openInventoryAndCountItems(page, ctx.pauseMs);
        await screenshots.capture(page, capturePrefix+'-inventory-before');
        await page.waitForTimeout(ctx.pauseMs);
        await TestInteractiveObjects.clickObjectFlexible(page, objectKey, matchMode);
        await page.waitForTimeout(delayMs + ctx.pauseMs);
        await screenshots.capture(page, capturePrefix+'-interaction-complete');
        let itemsAfter = await page.locator(Selectors.inventory.items+' > *').count();
        expect(itemsAfter, 'Inventory item slot count must increase after '+capturePrefix).toBeGreaterThan(itemsBefore);
        await screenshots.capture(page, capturePrefix+'-inventory-after');
    }

    static run()
    {
        test.describe('Interactive Objects', () => {
            test('player opens chest and receives items', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestInteractiveObjects.runObjectInteractionTest(
                    page, screenshots, gameConfig, longRun, 'e2eChestKey', 'chest', 2000
                );
            });
            test('player interacts with fish spawn and receives fish items', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestInteractiveObjects.runObjectInteractionTest(
                    page, screenshots, gameConfig, longRun, 'e2eFishSpawnKey', 'fish-spawn', 7000
                );
            });
            test('player mines rock and receives stone or ore items', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestInteractiveObjects.runObjectInteractionTest(
                    page, screenshots, gameConfig, longRun, 'e2eMiningRockKey', 'mining-rock', 7000
                );
            });
        });
    }
}

TestInteractiveObjects.run();
