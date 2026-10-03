/**
 *
 * Reldens - Test NPC
 *
 * Tests NPC dialogue, trader shop, item purchasing, item selling, the NPCs random movement and the dialogue of a moving
 * NPC away from its spawn tile.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { PhaserRange } = require('./helpers/phaser-range');
const { Navigation } = require('./helpers/navigation');
const { ObjectChase } = require('./helpers/object-chase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestNpc
{
    static MOVEMENT_SAMPLES = 30;
    static MOVEMENT_SAMPLE_INTERVAL_MS = 1000;
    static MOVEMENT_TEST_TIMEOUT_MS = 90000;
    static NPC_WANDER_TIMEOUT_MS = 60000;
    static NPC_LISTS = ['npcs', 'traders'];

    static async runRandomMovementTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestNpc.MOVEMENT_TEST_TIMEOUT_MS, longRun));
        let movingNpcs = BaseE2eTest.loadPlayerRoomEntries('root2', TestNpc.NPC_LISTS, true);
        expect(movingNpcs.length, 'The town must have NPCs configured with random movement').toBeGreaterThan(0);
        await TestNpc.loginRoot2Player(page, gameConfig, longRun);
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

    static async loginRoot2Player(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
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
        await TestNpc.loginRoot2Player(page, gameConfig, longRun);
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        await (traderKey
            ? Phaser.waitForObject(page, traderKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'trader', sceneTimeout));
        let traderCoords = await (traderKey
            ? Phaser.getObjectScreenCoords(page, traderKey)
            : Phaser.getObjectScreenCoordsByType(page, 'trader'));
        expect(traderCoords, 'Trader NPC must be found in the scene').not.toBeNull();
        await Navigation.focusGame(page);
        await ObjectChase.moveToObjectWithinRange(
            page,
            traderKey ? 'asset_key' : 'type',
            traderKey || 'trader',
            traderKey ? 'active' : 'visible',
            50,
            navTimeout
        );
        await Phaser.triggerObjectInteraction(page, traderKey || 'trader');
        await page.waitForTimeout(1000 + pauseMs);
        await TestNpc.sendTraderAction(page, traderKey || 'trader', 'buy');
        await page.waitForTimeout(1000 + pauseMs);
        return { traderKey, pauseMs, sceneTimeout };
    }

    static async runNpcDialogueTest(page, screenshots, gameConfig, longRun)
    {
        await TestNpc.loginRoot2Player(page, gameConfig, longRun);
        await TestNpc.openNpcDialogue(page, screenshots, gameConfig, longRun);
    }

    static async runWanderedNpcDialogueTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestNpc.MOVEMENT_TEST_TIMEOUT_MS, longRun));
        let npcKey = gameConfig.e2eNpcKey || '';
        let movingNpc = BaseE2eTest.loadPlayerRoomEntries('root2', TestNpc.NPC_LISTS, true).find(
            npc => npcKey === npc.clientKey
        );
        expect(movingNpc, 'The e2eNpcKey NPC must be configured with random movement').toBeTruthy();
        await TestNpc.loginRoot2Player(page, gameConfig, longRun);
        await page.waitForFunction((args) => {
            let scene = window.reldens.getActiveScene();
            let body = window.reldens.activeRoomEvents.room.state.bodies.get(args.key);
            if(!body || !scene.map){
                return false;
            }
            return args.tileSize <= Math.hypot(
                body.x - ((args.tileIndex % scene.map.width) * args.tileSize + args.tileSize / 2),
                body.y - (Math.floor(args.tileIndex / scene.map.width) * args.tileSize + args.tileSize / 2)
            );
        }, {key: movingNpc.clientKey, tileIndex: movingNpc.tileIndex, tileSize: Navigation.TILE_SIZE}, {
            timeout: TimeConstants.forLongRun(TestNpc.NPC_WANDER_TIMEOUT_MS, longRun)
        });
        await screenshots.capture(page, 'npc-away-from-spawn-tile');
        await TestNpc.openNpcDialogue(page, screenshots, gameConfig, longRun);
    }

    static async openNpcDialogue(page, screenshots, gameConfig, longRun)
    {
        let npcKey = gameConfig.e2eNpcKey || '';
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        await (npcKey
            ? Phaser.waitForObject(page, npcKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'npc', sceneTimeout));
        let npcCoords = await (npcKey
            ? Phaser.getObjectScreenCoords(page, npcKey)
            : Phaser.getObjectScreenCoordsByType(page, 'npc'));
        expect(npcCoords, 'NPC must be found in the scene').not.toBeNull();
        await screenshots.capture(page, 'npc-found-in-scene');
        await Navigation.focusGame(page);
        await ObjectChase.moveToObjectWithinRange(
            page,
            npcKey ? 'asset_key' : 'type',
            npcKey || 'npc',
            npcKey ? 'active' : 'visible',
            50,
            navTimeout
        );
        await page.waitForTimeout(pauseMs);
        await Phaser.triggerObjectInteraction(page, npcKey || 'npc');
        await page.waitForTimeout(1000 + pauseMs);
        let npcDialogueVisible = await page.waitForSelector(
            Selectors.npc.dialogue,
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
