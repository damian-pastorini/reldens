/**
 *
 * Reldens - Test NPC
 *
 * Tests NPC dialogue, trader shop, item purchasing, and item selling.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestNpc
{
    static async loginRoot2Player(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static async loginAndOpenTraderShop(page, gameConfig, longRun)
    {
        let traderKey = gameConfig.e2eTraderKey || '';
        await TestNpc.loginRoot2Player(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        let waitObjectTimeout = longRun ? 30000 : 15000;
        await (traderKey
            ? Phaser.waitForObject(page, traderKey, waitObjectTimeout)
            : Phaser.waitForObjectByType(page, 'trader', waitObjectTimeout));
        let traderCoords = await (traderKey
            ? Phaser.getObjectScreenCoords(page, traderKey)
            : Phaser.getObjectScreenCoordsByType(page, 'trader'));
        expect(traderCoords, 'Trader NPC must be found in the scene').not.toBeNull();
        await (traderKey ? Phaser.clickObject(page, traderKey) : Phaser.clickObjectByType(page, 'trader'));
        await page.waitForTimeout(1000 + pauseMs);
        return { traderKey, pauseMs, waitObjectTimeout };
    }

    static async runNpcDialogueTest(page, screenshots, gameConfig, longRun)
    {
        let npcKey = gameConfig.e2eNpcKey || '';
        await TestNpc.loginRoot2Player(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        let waitObjectTimeout = longRun ? 30000 : 15000;
        await (npcKey
            ? Phaser.waitForObject(page, npcKey, waitObjectTimeout)
            : Phaser.waitForObjectByType(page, 'npc', waitObjectTimeout));
        let npcCoords = await (npcKey
            ? Phaser.getObjectScreenCoords(page, npcKey)
            : Phaser.getObjectScreenCoordsByType(page, 'npc'));
        expect(npcCoords, 'NPC must be found in the scene').not.toBeNull();
        await screenshots.capture(page, 'npc-found-in-scene');
        await page.waitForTimeout(pauseMs);
        await (npcKey ? Phaser.clickObject(page, npcKey) : Phaser.clickObjectByType(page, 'npc'));
        await page.waitForTimeout(1000 + pauseMs);
        await expect(page.locator(Selectors.npc.dialogue)).toBeVisible({ timeout: 10000 });
        await screenshots.capture(page, 'npc-dialogue-visible');
    }

    static async runSellItemTest(page, screenshots, gameConfig, longRun)
    {
        let sellItemId = gameConfig.e2eSellItemId || gameConfig.e2eConsumableItemId || '';
        expect(sellItemId, 'e2eSellItemId or e2eConsumableItemId must be configured').toBeTruthy();
        let setup = await TestNpc.loginAndOpenTraderShop(page, gameConfig, longRun);
        await expect(page.locator(Selectors.trader.buyTab)).toBeVisible({ timeout: 10000 });
        await page.click(Selectors.trader.sellOption);
        await page.waitForTimeout(setup.pauseMs);
        await expect(page.locator(Selectors.trader.sellTab)).toBeVisible({ timeout: 10000 });
        await screenshots.capture(page, 'shop-sell-tab-visible');
        let qtyBefore = await page.locator(Selectors.inventory.itemQty(sellItemId)).textContent();
        let sellButton = page.locator(Selectors.trader.sellButton).first();
        await expect(sellButton).toBeVisible();
        await sellButton.click();
        await page.waitForTimeout(setup.pauseMs);
        await page.locator(Selectors.trader.confirmSell).click();
        await page.waitForTimeout(1000 + setup.pauseMs);
        await page.click(Selectors.hud.inventoryOpen);
        await page.waitForTimeout(setup.pauseMs);
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
                await expect(page.locator(Selectors.trader.buyTab)).toBeVisible({ timeout: 10000 });
                await screenshots.capture(page, 'trader-shop-buy-tab-visible');
            });

            test('buy item from NPC shop adds to inventory', async ({ page, screenshots, gameConfig, longRun }) => {
                let setup = await TestNpc.loginAndOpenTraderShop(page, gameConfig, longRun);
                await expect(page.locator(Selectors.trader.buyTab)).toBeVisible({ timeout: 10000 });
                let buyButton = page.locator(Selectors.trader.buyButton).first();
                await expect(buyButton).toBeVisible();
                await screenshots.capture(page, 'shop-buy-button-visible');
                await page.waitForTimeout(setup.pauseMs);
                await buyButton.click();
                await page.waitForTimeout(setup.pauseMs);
                await page.locator(Selectors.trader.confirmBuy).click();
                await page.waitForTimeout(1000 + setup.pauseMs);
                await page.click(Selectors.hud.inventoryOpen);
                await expect(page.locator(Selectors.inventory.items)).not.toBeEmpty();
                await screenshots.capture(page, 'inventory-after-buy');
            });

            test('sell item to NPC trader removes item from inventory', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestNpc.runSellItemTest(page, screenshots, gameConfig, longRun);
            });

        });
    }
}

TestNpc.run();
