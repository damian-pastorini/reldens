/**
 *
 * Reldens - Test NPC
 *
 * Tests NPC dialogue, trader shop, item purchasing, item selling, the NPCs random movement and the dialogue of a moving
 * NPC away from its spawn tile. The NPC and trader cases stop the object random movement and place the player next to
 * it from the server, and the moved NPC is placed on the closest walkable tile of its spawn tile, so every case starts
 * from known positions instead of chasing a moving object.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { PhaserRange } = require('./helpers/phaser-range');
const { Navigation } = require('./helpers/navigation');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { sc } = require('@reldens/utils');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestNpc
{
    static MOVEMENT_SAMPLES = 30;
    static MOVEMENT_SAMPLE_INTERVAL_MS = 1000;
    static MOVEMENT_TEST_TIMEOUT_MS = 90000;
    static NPC_LISTS = ['npcs', 'traders'];

    static async runRandomMovementTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestNpc.MOVEMENT_TEST_TIMEOUT_MS, longRun));
        let movingNpcs = BaseE2eTest.loadRoomEntries(Login.TOWN_ROOM_NAME, TestNpc.NPC_LISTS, true);
        expect(movingNpcs.length, 'The town must have NPCs configured with random movement').toBeGreaterThan(0);
        await Login.loginRootPlayer(page, gameConfig, longRun, '2');
        await Navigation.waitForRoom(page, Login.TOWN_ROOM_NAME, TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun));
        await screenshots.capture(page, 'town-npcs-before-wandering');
        let maxTilesByKey = Object.fromEntries(movingNpcs.map(npc => [npc.clientKey, npc.randomMovementTiles]));
        let ranges = await PhaserRange.collectPositionRanges(
            page,
            Object.keys(maxTilesByKey),
            TestNpc.MOVEMENT_SAMPLES,
            TestNpc.MOVEMENT_SAMPLE_INTERVAL_MS,
            PhaserRange.getStateBodiesPositions
        );
        await screenshots.capture(page, 'town-npcs-after-wandering');
        let movement = PhaserRange.summarizeMovement(ranges, maxTilesByKey, Navigation.TILE_SIZE);
        expect(movement.notSynced, 'Every moving NPC body must be synced in the room state').toEqual([]);
        expect(movement.wandered.length, 'At least one town NPC must wander').toBeGreaterThan(0);
        expect(movement.outOfArea, 'Every NPC must stay inside its configured movement area').toEqual([]);
    }

    static async placePlayerNextToNpc(page, gameConfig, objectKey, timeout)
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.TOWN_ROOM_NAME,
            objectKey,
            timeout
        );
        expect(placement.reached, 'The player must be placed next to '+objectKey+': '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

    static async sendTraderAction(page, traderKey, value)
    {
        await page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.objectsAnimations){
                return;
            }
            let anim = scene.objectsAnimations[args.key]
                || Object.values(scene.objectsAnimations).find(a => a.asset_key === args.key);
            if(!anim){
                return;
            }
            let tempId = (anim.key === anim.asset_key) ? anim.id : anim.key;
            window.reldens.activeRoomEvents.send({ 'act': 'oi', 'id': tempId, 'value': args.value });
        }, { key: traderKey, value });
    }

    static async loginAndOpenTraderShop(page, gameConfig, longRun)
    {
        let traderKey = gameConfig.e2eTraderKey || '';
        await Login.loginRootPlayer(page, gameConfig, longRun, '2');
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        await (traderKey
            ? Phaser.waitForObject(page, traderKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'trader', sceneTimeout));
        let traderCoords = await (traderKey
            ? Phaser.getObjectScreenCoords(page, traderKey)
            : Phaser.getObjectScreenCoordsByType(page, 'trader'));
        expect(traderCoords, 'Trader NPC must be found in the scene').not.toBeNull();
        let trader = await RoomMovementApi.switchRandomMovement(gameConfig, Login.TOWN_ROOM_NAME, traderKey, false);
        expect(trader, 'The trader body must be in the town room').toBeTruthy();
        await RoomMovementApi.placeObject(
            gameConfig,
            Login.TOWN_ROOM_NAME,
            traderKey,
            [trader.originalCol, trader.originalRow]
        );
        await Navigation.focusGame(page);
        await TestNpc.placePlayerNextToNpc(page, gameConfig, traderKey, sceneTimeout);
        await Phaser.triggerObjectInteraction(page, traderKey || 'trader');
        await page.waitForTimeout(1000 + pauseMs);
        await TestNpc.sendTraderAction(page, traderKey || 'trader', 'buy');
        await page.waitForTimeout(1000 + pauseMs);
        await RoomMovementApi.switchRandomMovement(gameConfig, Login.TOWN_ROOM_NAME, traderKey, true);
        return { traderKey, pauseMs, sceneTimeout };
    }

    static async runNpcDialogueTest(page, screenshots, gameConfig, longRun)
    {
        await Login.loginRootPlayer(page, gameConfig, longRun, '2');
        await TestNpc.openNpcDialogue(page, screenshots, gameConfig, longRun);
    }

    static async runWanderedNpcDialogueTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestNpc.MOVEMENT_TEST_TIMEOUT_MS, longRun));
        let npcKey = gameConfig.e2eNpcKey || '';
        let movingNpc = BaseE2eTest.loadRoomEntries(Login.TOWN_ROOM_NAME, TestNpc.NPC_LISTS, true).find(
            npc => npcKey === npc.clientKey
        );
        expect(movingNpc, 'The e2eNpcKey NPC must be configured with random movement').toBeTruthy();
        await Login.loginRootPlayer(page, gameConfig, longRun, '2');
        let npc = await RoomMovementApi.switchRandomMovement(gameConfig, Login.TOWN_ROOM_NAME, npcKey, false);
        expect(npc, 'The NPC body must be in the town room').toBeTruthy();
        let spawnTile = [npc.originalCol, npc.originalRow];
        let tiles = await RoomMovementApi.fetchTiles(gameConfig, Login.TOWN_ROOM_NAME, spawnTile, 1);
        let awayTile = [...WalkableTileLocator.findClosestTiles(tiles.walkable, spawnTile, 1)].shift();
        expect(awayTile, 'The NPC spawn tile must have a walkable neighbor tile').toBeTruthy();
        let movedNpc = await RoomMovementApi.placeObject(gameConfig, Login.TOWN_ROOM_NAME, npcKey, awayTile);
        expect([movedNpc.currentCol, movedNpc.currentRow]).toEqual(awayTile);
        expect([movedNpc.originalCol, movedNpc.originalRow]).toEqual(spawnTile);
        await screenshots.capture(page, 'npc-away-from-spawn-tile');
        await TestNpc.openNpcDialogue(page, screenshots, gameConfig, longRun);
    }

    static async openNpcDialogue(page, screenshots, gameConfig, longRun)
    {
        let npcKey = gameConfig.e2eNpcKey || '';
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        await (npcKey
            ? Phaser.waitForObject(page, npcKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'npc', sceneTimeout));
        let npcCoords = await (npcKey
            ? Phaser.getObjectScreenCoords(page, npcKey)
            : Phaser.getObjectScreenCoordsByType(page, 'npc'));
        expect(npcCoords, 'NPC must be found in the scene').not.toBeNull();
        await screenshots.capture(page, 'npc-found-in-scene');
        await Navigation.focusGame(page);
        await TestNpc.placePlayerNextToNpc(page, gameConfig, npcKey, sceneTimeout);
        await page.waitForTimeout(pauseMs);
        await Phaser.triggerObjectInteraction(page, npcKey || 'npc');
        await page.waitForTimeout(1000 + pauseMs);
        let npcDialogueVisible = await page.locator(Selectors.npc.dialogue).filter({visible: true}).first().waitFor(
            { state: 'visible', timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
        ).then(() => true).catch(() => false);
        expect(npcDialogueVisible, 'NPC dialogue box must be visible after interacting with NPC').toBeTruthy();
        await screenshots.capture(page, 'npc-dialogue-visible');
    }

    static async runSellItemTest(page, screenshots, gameConfig, longRun)
    {
        let sellItemId = gameConfig.e2eSellItemId || gameConfig.e2eConsumableItemId || '';
        expect(sellItemId, 'e2eSellItemId or e2eConsumableItemId must be configured').toBeTruthy();
        let setup = await TestNpc.loginAndOpenTraderShop(page, gameConfig, longRun);
        await expect(page.locator(Selectors.trader.buyTab)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
        );
        await TestNpc.sendTraderAction(page, setup.traderKey || 'trader', 'sell');
        await page.waitForTimeout(1000 + setup.pauseMs);
        await expect(page.locator(Selectors.trader.sellTab)).toBeVisible(
            { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
        );
        await screenshots.capture(page, 'shop-sell-tab-visible');
        let qtyBefore = await page.locator(Selectors.inventory.itemQty(sellItemId)).textContent();
        let sellButton = page.locator('.trade-container-sell .item-box:has(img[src$="/'+sellItemId+'.png"]) .trade-action-sell button').first();
        await expect(sellButton).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun)
        });
        await sellButton.click();
        await page.waitForTimeout(setup.pauseMs);
        await page.locator(Selectors.trader.confirmSell).click();
        await page.waitForTimeout(1000 + setup.pauseMs);
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        let qtyAfter = await page.locator(Selectors.inventory.itemQty(sellItemId)).textContent();
        expect(qtyAfter).not.toBe(qtyBefore);
        await screenshots.capture(page, 'inventory-after-sell');
    }

    static run()
    {
        test.describe('NPC System', () => {
            test('interact with NPC shows dialogue panel', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestNpc.runNpcDialogueTest(page, screenshots, gameConfig, longRun);
            });
            test('trader NPC opens shop panel', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestNpc.loginAndOpenTraderShop(page, gameConfig, longRun);
                await expect(page.locator(Selectors.trader.buyTab)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await screenshots.capture(page, 'trader-shop-buy-tab-visible');
            });
            test('buy item from NPC shop adds to inventory', async ({ page, screenshots, gameConfig, longRun }) => {
                let setup = await TestNpc.loginAndOpenTraderShop(page, gameConfig, longRun);
                await expect(page.locator(Selectors.trader.buyTab)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                let buyButton = page.locator(Selectors.trader.buyButton).first();
                await expect(buyButton).toBeVisible();
                await screenshots.capture(page, 'shop-buy-button-visible');
                await page.waitForTimeout(setup.pauseMs);
                await buyButton.click();
                await page.waitForTimeout(setup.pauseMs);
                await page.locator(Selectors.trader.confirmBuy).click();
                await page.waitForTimeout(1000 + setup.pauseMs);
                await page.click(Selectors.hud.inventoryOpen);
                await expect(page.locator(Selectors.inventory.items)).not.toBeEmpty({ timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun) });
                await screenshots.capture(page, 'inventory-after-buy');
            });
            test('sell item to NPC trader removes item from inventory', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestNpc.runSellItemTest(page, screenshots, gameConfig, longRun);
            });
            test('town NPCs with random movement wander inside their configured area', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestNpc.runRandomMovementTest(page, screenshots, gameConfig, longRun);
            });
            test('moving NPC opens its dialogue after it wandered away from its spawn tile', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestNpc.runWanderedNpcDialogueTest(page, screenshots, gameConfig, longRun);
            });
        });
    }
}

TestNpc.run();
