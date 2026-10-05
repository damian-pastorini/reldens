/**
 *
 * Reldens - Test Interactive Objects
 *
 * Tests chest, mining rock and fishing spot interactions. The player is placed from the server next to the first
 * instance of each object before the interaction, so the cases never depend on where the player or the objects were.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Phaser } = require('./helpers/phaser');
const { PhaserRange } = require('./helpers/phaser-range');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjects
{
    static FISH_SPAWN_CYCLES = ['first', 'second'];
    static FAR_OBJECT_TEST_TIMEOUT = 240000;

    static async waitForObjectInScene(page, objectKey, timeout)
    {
        let found = await Phaser.waitForObjectByAssetKey(page, objectKey, timeout).then(() => true).catch(() => false);
        if(!found){
            await Phaser.waitForObject(page, objectKey, timeout);
        }
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

    static async runTimingCycle(page, screenshots, objectKey, rewardItemId, forestData, label)
    {
        await page.waitForTimeout(TimeConstants.ACTION + forestData.pauseMs);
        let qtyBefore = await TimingObjectSession.fetchInventoryItemQty(page, rewardItemId);
        await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, objectKey);
        await screenshots.capture(page, 'fish-spawn-'+label+'-cycle-started');
        await expect
            .poll(
                async () => TimingObjectSession.fetchInventoryItemQty(page, rewardItemId),
                {
                    timeout: TimeConstants.TIMING_OBJECT_COMPLETE,
                    message: 'Reward item quantity must increase after the '+label+' timing cycle completes'
                }
            )
            .toBeGreaterThan(qtyBefore);
        await screenshots.capture(page, 'fish-spawn-'+label+'-cycle-rewarded');
        return TimingObjectSession.fetchInventoryItemQty(page, rewardItemId);
    }

    static async runMiningTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestInteractiveObjects.FAR_OBJECT_TEST_TIMEOUT, longRun));
        let objectKey = gameConfig.e2eMiningRockKey || '';
        expect(objectKey, 'e2eMiningRockKey not configured').toBeTruthy();
        let rewardItemId = gameConfig.e2eMiningRockRewardItemId || '';
        expect(rewardItemId, 'e2eMiningRockRewardItemId must be configured').toBeTruthy();
        let forestData = await TimingObjectSession.enterForestWithoutEnemies(page, gameConfig, longRun);
        await screenshots.capture(page, 'mining-rock-forest-entered');
        await TestInteractiveObjects.waitForObjectInScene(page, objectKey, forestData.sceneTimeout);
        await screenshots.capture(page, 'mining-rock-found-in-scene');
        let rockKey = await TimingObjectSession.placeNextToObject(
            page,
            gameConfig,
            objectKey,
            forestData.sceneTimeout,
            'mining rock'
        );
        await TimingObjectSession.openInventory(page, forestData.pauseMs);
        let rewardQtyBefore = await TimingObjectSession.fetchInventoryItemQty(page, rewardItemId);
        await screenshots.capture(page, 'mining-rock-inventory-before');
        await page.waitForTimeout(forestData.pauseMs);
        await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, rockKey);
        await expect
            .poll(
                async () => TimingObjectSession.fetchInventoryItemQty(page, rewardItemId),
                {
                    timeout: TimeConstants.forLongRun(TimeConstants.TIMING_OBJECT_COMPLETE, longRun),
                    message: 'Reward item quantity must increase after mining'
                }
            )
            .toBeGreaterThan(rewardQtyBefore);
        await screenshots.capture(page, 'mining-rock-interaction-complete');
        await screenshots.capture(page, 'mining-rock-inventory-after');
    }

    static async waitForNpcDialogue(page, selector, timeout)
    {
        return page.waitForFunction(
            (sel) => {
                let elements = document.querySelectorAll(sel);
                for(let i = 0; i < elements.length; i++){
                    if('block' === elements[i].style.display) {
                        return true;
                    }
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
                let forestData = await TimingObjectSession.enterForestWithoutEnemies(page, gameConfig, longRun);
                await screenshots.capture(page, 'chest-forest-entered');
                await TestInteractiveObjects.waitForObjectInScene(page, objectKey, forestData.sceneTimeout);
                await screenshots.capture(page, 'chest-found-in-scene');
                let chestKey = await TimingObjectSession.placeNextToObject(
                    page,
                    gameConfig,
                    objectKey,
                    forestData.sceneTimeout,
                    'chest'
                );
                await screenshots.capture(page, 'chest-player-in-range');
                await TestInteractiveObjects.clickObjectByAssetKeyOrKey(page, chestKey);
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
                await TestInteractiveObjects.runMiningTest(page, screenshots, gameConfig, longRun);
            });
            test('player fishes repeatedly at the same spawn without it moving or respawning', async ({ page, screenshots, gameConfig, longRun }) => {
                test.setTimeout(TimeConstants.forLongRun(TestInteractiveObjects.FAR_OBJECT_TEST_TIMEOUT, longRun));
                let objectKey = gameConfig.e2eFishSpawnKey || '';
                expect(objectKey, 'e2eFishSpawnKey not configured').toBeTruthy();
                let rewardItemId = gameConfig.e2eFishSpawnRewardItemId || '';
                expect(rewardItemId, 'e2eFishSpawnRewardItemId must be configured').toBeTruthy();
                let forestData = await TimingObjectSession.enterForestWithoutEnemies(page, gameConfig, longRun);
                await screenshots.capture(page, 'fish-spawn-forest-entered');
                await TestInteractiveObjects.waitForObjectInScene(page, objectKey, forestData.sceneTimeout);
                await screenshots.capture(page, 'fish-spawn-found-in-scene');
                let fishSpawnKey = await TimingObjectSession.placeNextToObject(
                    page,
                    gameConfig,
                    objectKey,
                    forestData.sceneTimeout,
                    'fish spawn'
                );
                let positionBefore = await PhaserRange.getObjectWorldPosByAssetKey(page, objectKey);
                expect(positionBefore, 'Fish spawn must expose a world position').toBeTruthy();
                await TimingObjectSession.openInventory(page, forestData.pauseMs);
                await screenshots.capture(page, 'fish-spawn-inventory-before');
                let startingQty = await TimingObjectSession.fetchInventoryItemQty(page, rewardItemId);
                let latestQty = startingQty;
                for(let cycleLabel of TestInteractiveObjects.FISH_SPAWN_CYCLES){
                    latestQty = await TestInteractiveObjects
                        .runTimingCycle(page, screenshots, fishSpawnKey, rewardItemId, forestData, cycleLabel);
                    let currentPosition = await PhaserRange.getObjectWorldPosByAssetKey(page, objectKey);
                    expect(
                        currentPosition,
                        'Fish spawn must stay in place after the '+cycleLabel+' use'
                    ).toEqual(positionBefore);
                }
                expect(
                    latestQty,
                    'Every completed fishing cycle must add one reward item at the same spawn'
                ).toBe(startingQty + TestInteractiveObjects.FISH_SPAWN_CYCLES.length);
                await screenshots.capture(page, 'fish-spawn-repeated-use-complete');
            });
        });
    }
}

TestInteractiveObjects.run();
