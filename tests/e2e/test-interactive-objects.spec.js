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
    static INTERACTION_RANGE = 50;

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
        return { pauseMs, sceneTimeout, navTimeout };
    }

    static async waitForObjectInScene(page, objectKey, timeout)
    {
        let found = await Phaser.waitForObjectByAssetKey(page, objectKey, timeout).then(() => true).catch(() => false);
        if(!found){
            await Phaser.waitForObject(page, objectKey, timeout);
        }
    }

    static async navigateToObjectAndAssertInRange(page, objectKey, ctx, label)
    {
        let reached = await Navigation.moveToObjectWithinRange(
            page,
            'asset_key',
            objectKey,
            'visible',
            TestInteractiveObjects.INTERACTION_RANGE,
            ctx.navTimeout
        );
        if(!reached){
            reached = await Navigation.moveToObjectWithinRange(
                page,
                'asset_key',
                objectKey,
                'active',
                TestInteractiveObjects.INTERACTION_RANGE,
                ctx.navTimeout
            );
        }
        expect(reached, 'Player must reach '+label+' within interaction range').toBeTruthy();
    }

    static async clickObjectByAssetKeyOrKey(page, objectKey)
    {
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

    static run()
    {
        test.describe('Interactive Objects', () => {
            test('player opens chest and receives interaction response', async ({ page, screenshots, gameConfig, longRun }) => {
                let objectKey = gameConfig.e2eChestKey || '';
                expect(objectKey, 'e2eChestKey not configured').toBeTruthy();
                let ctx = await TestInteractiveObjects.loginAndEnterForest(page, gameConfig, longRun);
                await screenshots.capture(page, 'chest-forest-entered');
                await TestInteractiveObjects.waitForObjectInScene(page, objectKey, ctx.sceneTimeout);
                await screenshots.capture(page, 'chest-found-in-scene');
                await TestInteractiveObjects.navigateToObjectAndAssertInRange(page, objectKey, ctx, 'chest');
                await screenshots.capture(page, 'chest-player-in-range');
                await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, objectKey);
                await page.waitForTimeout(2000 + ctx.pauseMs);
                await screenshots.capture(page, 'chest-interaction-complete');
                await expect(page.locator(Selectors.npc.dialogue)).toBeVisible({
                    timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
                });
                await screenshots.capture(page, 'chest-dialog-visible');
            });
            test('player mines rock and receives items', async ({ page, screenshots, gameConfig, longRun }) => {
                let objectKey = gameConfig.e2eMiningRockKey || '';
                expect(objectKey, 'e2eMiningRockKey not configured').toBeTruthy();
                let ctx = await TestInteractiveObjects.loginAndEnterForest(page, gameConfig, longRun);
                await screenshots.capture(page, 'mining-rock-forest-entered');
                await TestInteractiveObjects.waitForObjectInScene(page, objectKey, ctx.sceneTimeout);
                await screenshots.capture(page, 'mining-rock-found-in-scene');
                await TestInteractiveObjects.navigateToObjectAndAssertInRange(page, objectKey, ctx, 'mining rock');
                await page.click(Selectors.hud.inventoryOpen);
                await page.waitForTimeout(ctx.pauseMs);
                await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
                let itemsBefore = await page.locator(Selectors.inventory.items+' > *').count();
                await screenshots.capture(page, 'mining-rock-inventory-before');
                await page.waitForTimeout(ctx.pauseMs);
                await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, objectKey);
                await page.waitForTimeout(7000 + ctx.pauseMs);
                await screenshots.capture(page, 'mining-rock-interaction-complete');
                let itemsAfter = await page.locator(Selectors.inventory.items+' > *').count();
                expect(itemsAfter, 'Inventory item count must increase after mining').toBeGreaterThan(itemsBefore);
                await screenshots.capture(page, 'mining-rock-inventory-after');
            });
        });
    }
}

TestInteractiveObjects.run();
