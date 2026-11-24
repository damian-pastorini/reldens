/**
 *
 * Reldens - Test Exchanges One At A Time
 *
 * Tests that a player keeps one exchange at a time between the town trader shop (TraderSteps) and the player trades
 * (TradeSteps), ISSUE #358. With server/players/exchanges/newCancelsActive off (the default): a player in a trader shop
 * gets no trade request and its own invite is refused, the shop keeps its inventory lock; and a player in a trade that
 * sends a shop option (as the option button sends it, the open trade box covers the trader dialog) gets "Close your
 * other exchange first." in the trader dialog, no shop opens and the trade stays.
 * With it on (the live inventory message actions and the trader object values turned on, restored by the group reset):
 * a trade accepted by a player in a shop cancels its shop exchange, and the shop closed later never unlocks the
 * inventory of the running trade; and a player in a trade that opens a shop cancels the trade for both players. In both
 * modes a buy shop switched to the sell shop of the same trader answers the sell items.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { TraderSteps } = require('./helpers/trader-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const ObjectsTranslations = require('../../lib/objects/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestExchangesOneAtATime
{

    static EXCHANGE_IN_PROGRESS = ObjectsTranslations.objects.trader.exchangeInProgress;

    static async enter(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        return await TradeSteps.enterPlayers(context, 2);
    }

    static async enableNewExchangeCancelsActive(context)
    {
        await TradeSteps.enableNewExchangeCancelsActive(context);
        await NpcDialogSteps.changeObjectProperty(
            context,
            Login.TOWN_ROOM_NAME,
            context.gameConfig.e2eTraderKey,
            'newExchangeCancelsActive',
            true
        );
    }

    static async sendBuyOption(context, player)
    {
        let traderKey = context.gameConfig.e2eTraderKey;
        await NpcDialogSteps.placeNextToNpc(context, player.page, traderKey);
        let shop = {page: player.page, traderKey, action: 'buy', container: player.page.locator('.trade-container-buy')};
        await TraderSteps.sendShopMessage(shop, {});
        return shop;
    }

    static async runShopperTradeRefusedTest(context)
    {
        let [shopper, inviter] = await TestExchangesOneAtATime.enter(context);
        await TraderSteps.openShop(context, shopper, 'buy');
        await TradeSteps.expectLocked(context, shopper, true, 'The shop locks the shopper inventory');
        await TradeSteps.start(inviter, shopper);
        await TradeSteps.expectNoTradeStart(shopper, 'A player in a trader shop gets no trade request');
        await TradeSteps.start(shopper, inviter);
        await TradeSteps.expectNoTradeStart(inviter, 'The invite of a player in a trader shop is refused');
        await TradeSteps.expectLocked(context, shopper, true, 'The shop keeps the shopper inventory lock');
    }

    static async runTraderRefusedInTradeTest(context)
    {
        let [trader, partner] = await TestExchangesOneAtATime.enter(context);
        await TradeSteps.open(trader, partner);
        let shop = await TestExchangesOneAtATime.sendBuyOption(context, trader);
        await expect(
            trader.page.locator('.box-content').filter({hasText: TestExchangesOneAtATime.EXCHANGE_IN_PROGRESS}),
            'The trader asks to close the other exchange first'
        ).toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        await expect(shop.container, 'No shop opens while the player trades').toBeHidden();
        await TradeSteps.expectTradeOpen(context, partner, true, 'The player trade stays open');
        await TradeSteps.expectLocked(context, trader, true, 'The trade keeps the trader inventory lock');
    }

    static async runShopperAcceptCancelsTheShopTest(context)
    {
        let [shopper, inviter] = await TestExchangesOneAtATime.enter(context);
        await TestExchangesOneAtATime.enableNewExchangeCancelsActive(context);
        let shop = await TraderSteps.openShop(context, shopper, 'buy');
        await TradeSteps.open(inviter, shopper);
        await TradeSteps.expectTradeOpen(context, shopper, true, 'The accepted trade opens for the shopper');
        await shop.page.locator('.cancel-'+shop.action).click();
        await expect(shop.container, 'The cancel button closes the shop').toBeHidden({timeout: TimeConstants.SERVER_RESPONSE});
        await TradeSteps.expectLocked(context, shopper, true, 'The shop closed later keeps the trade lock');
        await TradeSteps.expectTradeOpen(context, inviter, true, 'The trade keeps running after the shop close');
    }

    static async runShopCancelsTheTradeTest(context)
    {
        let [trader, partner] = await TestExchangesOneAtATime.enter(context);
        await TestExchangesOneAtATime.enableNewExchangeCancelsActive(context);
        await TradeSteps.open(trader, partner);
        await RoomMessagesRecorder.start(partner.page);
        let shop = await TestExchangesOneAtATime.sendBuyOption(context, trader);
        await expect(shop.container, 'The shop opens for the player that was trading')
            .toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        await TradeSteps.expectTradeOpen(context, partner, false, 'The shop cancels the trade of the partner');
        await TradeSteps.expectTradeOpen(context, trader, false, 'The shop cancels the trade of the shopper');
        await TradeSteps.expectLocked(context, partner, false, 'The partner inventory is unlocked');
        await TradeSteps.expectLocked(context, trader, true, 'The shop locks the shopper inventory');
    }

    static async expectSellAfterBuy(context, shopper)
    {
        let buyShop = await TraderSteps.openShop(context, shopper, 'buy');
        let sellShop = Object.assign({}, buyShop, {action: 'sell'});
        let previousCount = (await TraderSteps.fetchResults(shopper.page)).length;
        await TraderSteps.sendShopMessage(sellShop, {});
        let sellResult = await TraderSteps.waitForResult(sellShop, previousCount);
        expect(sellResult.action, 'The same trader answers the sell shop').toBe('sell');
        await expect(
            shopper.page.locator('.box-content').filter({hasText: TestExchangesOneAtATime.EXCHANGE_IN_PROGRESS}),
            'The switch to the sell shop of the same trader is never refused'
        ).toHaveCount(0);
    }

    static async runSellAfterBuyTest(context)
    {
        let [shopper] = await TestExchangesOneAtATime.enter(context);
        await TestExchangesOneAtATime.expectSellAfterBuy(context, shopper);
    }

    static async runSellAfterBuyCancelOnTest(context)
    {
        let [shopper] = await TestExchangesOneAtATime.enter(context);
        await TestExchangesOneAtATime.enableNewExchangeCancelsActive(context);
        await TestExchangesOneAtATime.expectSellAfterBuy(context, shopper);
    }

    static run()
    {
        test.describe('Exchanges One At A Time', () => {
            test('a player in a trader shop gets no trade request, its invite is refused and the shop keeps its lock', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestExchangesOneAtATime.runShopperTradeRefusedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('a player in a trade choosing a shop option is asked to close the other exchange first and keeps its trade', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestExchangesOneAtATime.runTraderRefusedInTradeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('with the new exchange cancel on a trade accepted by a shopper cancels its shop and the later shop close keeps the trade lock', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestExchangesOneAtATime.runShopperAcceptCancelsTheShopTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('with the new exchange cancel on a player in a trade opening a shop cancels the trade for both players', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestExchangesOneAtATime.runShopCancelsTheTradeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('a buy shop switched to the sell shop of the same trader answers the sell items', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestExchangesOneAtATime.runSellAfterBuyTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('with the new exchange cancel on a buy shop switched to the sell shop of the same trader answers the sell items', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestExchangesOneAtATime.runSellAfterBuyCancelOnTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestExchangesOneAtATime.run();
