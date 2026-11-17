/**
 *
 * Reldens - Test Trader Shop
 *
 * Tests the town trader shop with its real buttons (exclusive group, TraderSteps, the player inventory preserved for
 * the group and the quantities of the traded items set on the live inventory, the prices and rewards read from the
 * stored trader requirements and rewards): the Buy and Sell option buttons open their tabs; a bought item is shown in
 * the cart with its quantity, the confirm takes the required coins, gives the item and shows the buy confirmed text; a
 * sold item shows its reward in the sell value column, the confirm takes the item, gives the reward and shows the sell
 * confirmed text (a bought quantity above 1 gives one item, ISSUE #353); an item removed from the cart before the
 * confirm is not bought; a second purchase after a confirm runs as a new transaction; the bought item is kept after a new
 * login; and the sell list shows no equipped item and no item without a reward.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { TraderSteps } = require('./helpers/trader-steps');
const { ItemsSteps } = require('./helpers/items-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const ObjectsTranslations = require('../../lib/objects/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTraderShop
{

    static TRADER_SNIPPETS = ObjectsTranslations.objects.trader;
    static COINS = 10;
    static fetchPrice = async (context, itemKey) => Number([
        ...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'objectsItemsRequirements', {item_key: itemKey})
    ].shift().required_quantity);
    static fetchReward = async (context, itemKey) => Number([
        ...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'objectsItemsRewards', {item_key: itemKey})
    ].shift().reward_quantity);

    static async enterWithItems(context, quantities)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        await E2eSeedAndRestoreApi.preserveRows(context.gameConfig, context.e2eGroup, 'itemsInventory', {
            owner_id: player.playerId
        });
        await ItemsSteps.setQuantities(context, player, quantities);
        return player;
    }

    static async expectConfirmedText(shop, text)
    {
        await expect(shop.page.locator('.box-content').filter({hasText: text}), 'The trader shows the confirmed text')
            .toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async buyAndConfirm(context, player, itemKey)
    {
        let shop = await TraderSteps.openShop(context, player, 'buy');
        expect((await TraderSteps.addToCart(shop, itemKey)).subActionResult, 'The '+itemKey+' is added to the cart')
            .toBe(true);
        expect((await TraderSteps.confirm(shop)).subActionResult, 'The '+itemKey+' purchase is confirmed').toBe(true);
        await TestTraderShop.expectConfirmedText(shop, TestTraderShop.TRADER_SNIPPETS.buyConfirmed);
        return shop;
    }

    static async runOptionTabTest(context, action)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let shop = await TraderSteps.openShop(context, player, action);
        await expect(shop.container.locator('.confirm-'+action), 'The '+action+' tab shows its confirm button').toBeVisible();
    }

    static async runBuyTest(context)
    {
        let player = await TestTraderShop.enterWithItems(context, {coins: TestTraderShop.COINS, axe: 0});
        let shop = await TraderSteps.openShop(context, player, 'buy');
        let added = await TraderSteps.addToCart(shop, 'axe');
        expect(added.subActionResult, 'The axe is added to the cart').toBe(true);
        await expect(shop.container.locator('.trade-col-2 .trade-item-'+added.itemId+' .item-qty'), 'The cart quantity')
            .toHaveText('1');
        expect((await TraderSteps.confirm(shop)).subActionResult, 'The purchase is confirmed').toBe(true);
        await TestTraderShop.expectConfirmedText(shop, TestTraderShop.TRADER_SNIPPETS.buyConfirmed);
        await ItemsSteps.expectStoredQuantities(
            context,
            player,
            {coins: TestTraderShop.COINS - await TestTraderShop.fetchPrice(context, 'axe'), axe: 1},
            'The purchase takes the axe price and gives one axe'
        );
    }

    static async runSellTest(context)
    {
        let itemKey = context.gameConfig.e2eSellItemId;
        let reward = await TestTraderShop.fetchReward(context, itemKey);
        let player = await TestTraderShop.enterWithItems(context, {coins: 0, [itemKey]: 1});
        let shop = await TraderSteps.openShop(context, player, 'sell');
        expect((await TraderSteps.addToCart(shop, itemKey)).subActionResult, 'The item is added to the sale').toBe(true);
        await expect(shop.container.locator('.trade-col-3 .reward-qty'), 'The sell value column shows the reward')
            .toHaveText(String(reward));
        expect((await TraderSteps.confirm(shop)).subActionResult, 'The sale is confirmed').toBe(true);
        await TestTraderShop.expectConfirmedText(shop, TestTraderShop.TRADER_SNIPPETS.sellConfirmed);
        await ItemsSteps.expectStoredQuantities(
            context,
            player,
            {coins: reward, [itemKey]: 0},
            'The sale takes the item and gives its reward'
        );
    }

    static async runRemoveTest(context)
    {
        let player = await TestTraderShop.enterWithItems(context, {coins: TestTraderShop.COINS, axe: 0});
        let shop = await TraderSteps.openShop(context, player, 'buy');
        let added = await TraderSteps.addToCart(shop, 'axe');
        let previousCount = (await TraderSteps.fetchResults(shop.page)).length;
        await shop.container.locator('.trade-col-2 .trade-item-'+added.itemId+' .trade-action-remove').click();
        await TraderSteps.waitForResult(shop, previousCount);
        await expect(shop.container.locator('.trade-col-2 .trade-item'), 'The cart is empty').toHaveCount(0);
        await TraderSteps.confirm(shop);
        await ItemsSteps.expectStoredQuantities(
            context,
            player,
            {coins: TestTraderShop.COINS, axe: 0},
            'The removed item is not bought'
        );
    }

    static async runSecondPurchaseTest(context)
    {
        let player = await TestTraderShop.enterWithItems(context, {coins: TestTraderShop.COINS, axe: 0, spear: 0});
        await TestTraderShop.buyAndConfirm(context, player, 'axe');
        await TestTraderShop.buyAndConfirm(context, player, 'spear');
        await ItemsSteps.expectStoredQuantities(
            context,
            player,
            {
                coins: TestTraderShop.COINS - await TestTraderShop.fetchPrice(context, 'axe')
                    - await TestTraderShop.fetchPrice(context, 'spear'),
                axe: 1,
                spear: 1
            },
            'Both purchases are paid and given'
        );
    }

    static async runReloginTest(context)
    {
        let player = await TestTraderShop.enterWithItems(context, {coins: TestTraderShop.COINS, axe: 0});
        await TestTraderShop.buyAndConfirm(context, player, 'axe');
        await player.page.goto('about:blank');
        await Login.loginRootPlayer(player.page, context.gameConfig, context.longRun);
        expect(
            [await TradeSteps.fetchQuantity(context, player, 'axe'), await TradeSteps.fetchQuantity(context, player, 'coins')],
            'The bought axe and the left coins are loaded on the new login'
        ).toEqual([1, TestTraderShop.COINS - await TestTraderShop.fetchPrice(context, 'axe')]);
    }

    static async runSellListTest(context)
    {
        let sellableKey = context.gameConfig.e2eSellItemId;
        let player = await TestTraderShop.enterWithItems(context, {[sellableKey]: 1, branch: 1});
        await ItemsSteps.equipAxe(context, player);
        let shop = await TraderSteps.openShop(context, player, 'sell');
        let listedImage = (itemKey) => shop.container.locator('.trade-col-1 img[src$="/'+itemKey+'.png"]');
        await expect(listedImage(sellableKey), 'An item with a reward is listed').toHaveCount(1);
        await expect(listedImage(context.gameConfig.e2eEquipableItemId), 'The equipped item is not listed').toHaveCount(0);
        await expect(listedImage('branch'), 'An item without a reward is not listed').toHaveCount(0);
    }

    static run()
    {
        test.describe('Trader Shop', () => {
            test('the real Buy option button opens the buy tab', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runOptionTabTest({page, gameConfig, e2eGroup, longRun}, 'buy');
            });
            test('the real Sell option button opens the sell tab', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runOptionTabTest({page, gameConfig, e2eGroup, longRun}, 'sell');
            });
            test('a bought item shows in the cart, takes its price, is given and shows the buy confirmed text', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runBuyTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a sold item shows its reward, is taken, gives its reward and shows the sell confirmed text', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runSellTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an item removed from the cart before the confirm is not bought', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runRemoveTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a second purchase after a confirm runs as a new transaction', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runSecondPurchaseTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a bought item and the left coins are kept after a new login', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runReloginTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the sell list shows no equipped item and no item without a reward', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderShop.runSellListTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTraderShop.run();
