/**
 *
 * Reldens - Test Trader Rules
 *
 * Tests the town trader checks (exclusive group, TraderSteps, the player inventory preserved for the group and the
 * quantities of the traded items set on the live inventory, the prices read from the stored trader requirements): an
 * item added to the cart without enough coins is refused with its error and changes nothing; a pushed quantity of 0,
 * negative, not an integer or above the owned quantity is refused; an unknown trade action value opens nothing, and an unknown sub action only starts the transaction; a sub
 * action sent with no transaction started starts it first; a confirm sent after the shop was closed changes nothing; a
 * trader action sent out of reach closes the shop and is refused, or with closeInteractionOnOutOfReach off keeps the
 * shop open and is refused. The test of the sub action with no
 * transaction clears the live trader transactions first, the transactions of the players that left are never removed.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { TraderSteps } = require('./helpers/trader-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { ItemsSteps } = require('./helpers/items-steps');
const { MovementScenario } = require('./helpers/movement-scenario');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTraderRules
{

    static COINS = 10;
    static INVALID_QUANTITIES = [0, -1, 1.5, 2];
    static ADD = {sub: ObjectsConst.TRADE_ACTIONS.ADD};
    static CONFIRM = {sub: ObjectsConst.TRADE_ACTIONS.CONFIRM};
    static fetchPrice = async (context, itemKey) => Number([
        ...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'objectsItemsRequirements', {item_key: itemKey})
    ].shift().required_quantity);

    static async enterWithItems(context, quantities, playersCount = 1)
    {
        let players = await TeamSteps.enterPlayers(context, playersCount);
        for(let player of players){
            await E2eSeedAndRestoreApi.preserveRows(context.gameConfig, context.e2eGroup, 'itemsInventory', {
                owner_id: player.playerId
            });
            await ItemsSteps.setQuantities(context, player, quantities);
        }
        return players;
    }

    static async expectNoNewResult(shop, previousCount, message)
    {
        await shop.page.waitForTimeout(TimeConstants.ACTION);
        expect((await TraderSteps.fetchResults(shop.page)).length, message).toBe(previousCount);
    }

    static async sendAndWait(shop, message)
    {
        let previousCount = (await TraderSteps.fetchResults(shop.page)).length;
        await TraderSteps.sendShopMessage(shop, message);
        return await TraderSteps.waitForResult(shop, previousCount);
    }

    static async runNoCoinsTest(context)
    {
        let player = (await TestTraderRules.enterWithItems(context, {coins: 0, axe: 0})).shift();
        let shop = await TraderSteps.openShop(context, player, 'buy');
        let added = await TraderSteps.addToCart(shop, 'axe');
        expect(
            [added.subActionResult, Boolean(added.lastErrorMessage), added.exchangeData.A],
            'The item without enough coins is refused with its error and kept out of the cart'
        ).toEqual([false, true, {}]);
        await ItemsSteps.expectStoredQuantities(context, player, {coins: 0, axe: 0}, 'The refused item changes nothing');
    }

    static async runInvalidQuantityTest(context)
    {
        let itemKey = context.gameConfig.e2eSellItemId;
        let player = (await TestTraderRules.enterWithItems(context, {[itemKey]: 1})).shift();
        let shop = await TraderSteps.openShop(context, player, 'sell');
        let itemId = await TraderSteps.findShopItemId(shop, itemKey);
        for(let qty of TestTraderRules.INVALID_QUANTITIES){
            let result = await TestTraderRules.sendAndWait(shop, Object.assign({itemId, itemKey, qty}, TestTraderRules.ADD));
            expect([result.subActionResult, result.exchangeData.B], 'The quantity '+qty+' is refused').toEqual([false, {}]);
        }
    }

    static async runInvalidActionTest(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let shop = await TraderSteps.openShop(context, player, 'buy');
        let previousCount = (await TraderSteps.fetchResults(shop.page)).length;
        await TraderSteps.sendShopMessage(shop, {value: 'steal'});
        await TestTraderRules.expectNoNewResult(shop, previousCount, 'An unknown trade action opens nothing');
    }

    static async runUnknownSubActionTest(context)
    {
        let player = (await TeamSteps.enterPlayers(context, 1)).shift();
        let shop = await TraderSteps.openShop(context, player, 'buy');
        let result = await TestTraderRules.sendAndWait(shop, {sub: 'unknown'});
        expect([Boolean(result.subAction), 0 < Object.keys(result.items).length], 'An unknown sub action only starts it')
            .toEqual([false, true]);
    }

    static async runNoTransactionTest(context)
    {
        let players = await TestTraderRules.enterWithItems(context, {coins: TestTraderRules.COINS, axe: 0}, 2);
        let listingShop = await TraderSteps.openShop(context, players[1], 'buy');
        let itemId = await TraderSteps.findShopItemId(listingShop, 'axe');
        await NpcDialogSteps.changeObjectProperty(context, Login.TOWN_ROOM_NAME, listingShop.traderKey, 'tradesInProgress', {});
        await NpcDialogSteps.placeNextToNpc(context, players[0].page, context.gameConfig.e2eTraderKey);
        let shop = {page: players[0].page, traderKey: context.gameConfig.e2eTraderKey, action: 'buy'};
        let result = await TestTraderRules.sendAndWait(shop, Object.assign({itemId, itemKey: 'axe', qty: 1}, TestTraderRules.ADD));
        expect([result.subAction, result.subActionResult], 'The sub action starts the transaction and runs: '+result.lastErrorMessage)
            .toEqual([ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.ADD, true]);
    }

    static async openCartsWithAxe(context, playersCount)
    {
        let carts = [];
        for(let player of await TestTraderRules.enterWithItems(context, {coins: TestTraderRules.COINS, axe: 0}, playersCount)){
            let shop = await TraderSteps.openShop(context, player, 'buy');
            await TraderSteps.addToCart(shop, 'axe');
            carts.push({player, shop});
        }
        return carts;
    }

    static async closeShop(shop)
    {
        await shop.page.locator('.cancel-'+shop.action).click();
        await expect(shop.container, 'The cancel button closes the shop').toBeHidden({timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async confirmAll(carts)
    {
        for(let cart of carts){
            await TraderSteps.sendShopMessage(cart.shop, TestTraderRules.CONFIRM);
        }
        await carts[0].shop.page.waitForTimeout(TimeConstants.ACTION);
    }

    static async expectBought(context, cart, isBought, message)
    {
        let quantities = {coins: TestTraderRules.COINS, axe: 0};
        if(isBought){
            quantities = {coins: TestTraderRules.COINS - await TestTraderRules.fetchPrice(context, 'axe'), axe: 1};
        }
        await ItemsSteps.expectStoredQuantities(context, cart.player, quantities, message);
    }

    static async runClosedShopConfirmTest(context)
    {
        let cart = (await TestTraderRules.openCartsWithAxe(context, 1)).shift();
        await TestTraderRules.closeShop(cart.shop);
        await TestTraderRules.confirmAll([cart]);
        await TestTraderRules.expectBought(context, cart, false, 'A confirm sent after the shop was closed buys nothing');
        await TraderSteps.openShop(context, cart.player, 'buy');
    }

    static async runSameTimeTradesTest(context)
    {
        let carts = await TestTraderRules.openCartsWithAxe(context, 2);
        await TestTraderRules.confirmAll(carts);
        for(let cart of carts){
            await TestTraderRules.expectBought(context, cart, true, 'Each player buys its own cart: '+cart.player.playerName);
        }
    }

    static async runOtherPlayerClosedTest(context)
    {
        let carts = await TestTraderRules.openCartsWithAxe(context, 2);
        await TestTraderRules.closeShop(carts[0].shop);
        await TestTraderRules.confirmAll([carts[1]]);
        await TestTraderRules.expectBought(context, carts[0], false, 'The closed cart buys nothing');
        await TestTraderRules.expectBought(context, carts[1], true, 'The other player confirms its cart after the close');
    }

    static async runReloginCartTest(context)
    {
        let cart = (await TestTraderRules.openCartsWithAxe(context, 1)).shift();
        await cart.player.page.goto('about:blank');
        await Login.loginRootPlayer(cart.player.page, context.gameConfig, context.longRun);
        let shop = await TraderSteps.openShop(context, cart.player, 'buy');
        await expect(shop.container.locator('.trade-col-2 .trade-item'), 'The new session cart is empty').toHaveCount(0);
        await TestTraderRules.confirmAll([{player: cart.player, shop}]);
        await TestTraderRules.expectBought(context, cart, false, 'The cart of the left session is not bought');
    }

    static async runOutOfReachTest(context, isCloseEnabled)
    {
        let player = (await TestTraderRules.enterWithItems(context, {coins: TestTraderRules.COINS, axe: 0})).shift();
        let shop = await TraderSteps.openShop(context, player, 'buy');
        let itemId = await TraderSteps.findShopItemId(shop, 'axe');
        if(!isCloseEnabled){
            await NpcDialogSteps.changeObjectProperty(
                context,
                Login.TOWN_ROOM_NAME,
                shop.traderKey,
                'closeInteractionOnOutOfReach',
                false
            );
        }
        await MovementScenario.placePlayerOnReturnPoint(
            player.page,
            MovementScenario.createWalkContext(context.gameConfig, Login.TOWN_ROOM_NAME, player.playerName, context.longRun)
        );
        let previousCount = (await TraderSteps.fetchResults(shop.page)).length;
        await TraderSteps.sendShopMessage(shop, Object.assign({itemId, itemKey: 'axe', qty: 1}, TestTraderRules.ADD));
        await TestTraderRules.expectNoNewResult(shop, previousCount, 'The trader action out of reach is refused');
        let shopState = expect(shop.container, 'The shop closes out of reach only with the close on');
        await (isCloseEnabled ? shopState.toBeHidden({timeout: TimeConstants.SERVER_RESPONSE}) : shopState.toBeVisible());
    }

    static run()
    {
        test.describe('Trader Rules', () => {
            test('an item added to the cart without enough coins is refused with its error', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runNoCoinsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a pushed quantity of 0, negative, not an integer or above the owned one is refused', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runInvalidQuantityTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an unknown trade action value opens nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runInvalidActionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('an unknown sub action only starts the transaction', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runUnknownSubActionTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a sub action sent with no transaction started starts it first', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runNoTransactionTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a confirm sent after the shop was closed buys nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runClosedShopConfirmTest({page, gameConfig, e2eGroup, longRun});
            });
            test('two players trading with the trader at the same time buy their own carts', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runSameTimeTradesTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player closing the shop does not stop the other player confirm', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runOtherPlayerClosedTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the shop opened after a new login has an empty cart and buys nothing', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runReloginCartTest({page, gameConfig, e2eGroup, longRun});
            });            test('a trader action sent out of reach closes the shop and is refused', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runOutOfReachTest({page, gameConfig, e2eGroup, longRun}, true);
            });
            test('with the out of reach close off a trader action out of reach keeps the shop and is refused', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestTraderRules.runOutOfReachTest({page, gameConfig, e2eGroup, longRun}, false);
            });
        });
    }

}

TestTraderRules.run();
