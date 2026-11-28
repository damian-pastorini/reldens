/**
 *
 * Reldens - Test Trading Requests
 *
 * Tests the trade requests with more than two players or crossed between two players (TradeSteps: the trade messages
 * sent as a client sends them, the trade messages each client received and the live trade state of each player): a
 * second accept of the same invite and an accept by a player that was not invited are rejected; an accept after the
 * inviter left the room is rejected and the server keeps opening trades; a trade with oneself or with a missing session
 * sends nothing; a player keeps one exchange at a time (ISSUE #358): with server/players/exchanges/newCancelsActive off
 * (the default) a player in a trade inviting another player, or an invite to a player in a trade, is refused and the
 * open trade stays locked, with it on starting a new trade cancels the open exchange while the box of the old partner
 * stays open and a player in a trade that accepts another invite ends the old trade for its old partner; a player with
 * its own invite pending that accepts another invite drops its invite, so the old invited player neither joins nor
 * cancels the new trade, live or once it is closed (ISSUE #475); two players
 * inviting the same player give one request box per inviter; an unrelated player gets no trade message or box; and two
 * players that invite each other and both accept get one consistent trade: the first accept starts it, the crossed
 * second accept is refused (both players are in an exchange) and never cancels it, and the offer works on it.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { InventoryConst } = require('../../lib/inventory/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTradingRequests
{

    static MISSING_SESSION_ID = 'e2e-missing-session';

    static async enter(context, playersCount = 3)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        return await TradeSteps.enterPlayers(context, playersCount);
    }

    static async clearMessages(players)
    {
        for(let player of players){
            await RoomMessagesRecorder.start(player.page);
        }
    }

    static async runDoubleAcceptTest(context)
    {
        let [inviter, invited, other] = await TestTradingRequests.enter(context);
        await TradeSteps.start(inviter, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 1);
        let accept = {act: InventoryConst.ACTIONS.TRADE_ACCEPTED, id: inviter.sessionId, value: TradeSteps.ACCEPT};
        await RoomMessagesRecorder.sendMessages(invited.page, [accept, accept]);
        await RoomMessagesRecorder.sendMessage(other.page, accept);
        await inviter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(
            (await RoomMessagesRecorder.fetchMessages(inviter.page, InventoryConst.ACTIONS.TRADE_SHOW)).length,
            'The second accept opens nothing'
        ).toBe(1);
        await TradeSteps.expectNoTradeShow([other], 'The player that was not invited opens nothing');
        expect((await TradeSteps.fetchState(context, inviter)).trade.ownersIds, 'The trade stays between both players')
            .toEqual({A: inviter.sessionId, B: invited.sessionId});
    }

    static async runInviterLeftTest(context)
    {
        let [first, invited, leaving] = await TestTradingRequests.enter(context);
        await TradeSteps.start(leaving, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 1);
        await leaving.page.close();
        await invited.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await TradeSteps.answer(invited, leaving);
        await TradeSteps.expectNoTradeShow([invited], 'The accept after the inviter left is rejected');
        await TestTradingRequests.clearMessages([first, invited]);
        await TradeSteps.open(first, invited);
        await TradeSteps.expectTradeOpen(context, invited, true, 'The server keeps opening trades');
    }

    static async runSelfAndMissingTest(context)
    {
        let [player, other] = await TestTradingRequests.enter(context, 2);
        await TradeSteps.start(player, player);
        await TradeSteps.start(player, {sessionId: TestTradingRequests.MISSING_SESSION_ID});
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        for(let receiver of [player, other]){
            expect(
                await RoomMessagesRecorder.fetchMessages(receiver.page, InventoryConst.ACTIONS.TRADE_START),
                'No request reaches '+receiver.playerName
            ).toEqual([]);
        }
        expect((await TradeSteps.fetchState(context, player)).invitedSessionId, 'Nobody is invited').toBe(false);
    }

    static async runTradingPlayerInviteRefusedTest(context)
    {
        let [starter, partner, newPartner] = await TestTradingRequests.enter(context);
        await TradeSteps.open(starter, partner);
        await TradeSteps.start(starter, newPartner);
        await TradeSteps.expectNoTradeStart(newPartner, 'The invite of a player in a trade is refused');
        await TradeSteps.expectTradeOpen(context, partner, true, 'The open trade stays');
        await TradeSteps.expectLocked(context, partner, true, 'The partner inventory stays locked by the trade');
    }

    static async runInviteToTradingPlayerRefusedTest(context)
    {
        let [newInviter, invited, oldPartner] = await TestTradingRequests.enter(context);
        await TradeSteps.open(oldPartner, invited);
        await TestTradingRequests.clearMessages([newInviter, invited, oldPartner]);
        await TradeSteps.start(newInviter, invited);
        await TradeSteps.expectNoTradeStart(invited, 'The invite to a player in a trade is refused');
        await TradeSteps.expectTradeOpen(context, oldPartner, true, 'The trade of the invited player stays');
        await TradeSteps.expectLocked(context, oldPartner, true, 'The old partner inventory stays locked by the trade');
    }

    static async runNewTradeCancelsPreviousTest(context)
    {
        let [starter, partner, newPartner] = await TestTradingRequests.enter(context);
        await TradeSteps.enableNewExchangeCancelsActive(context);
        await TradeSteps.open(starter, partner);
        await TradeSteps.start(starter, newPartner);
        await TradeSteps.waitForMessages(newPartner, InventoryConst.ACTIONS.TRADE_START, 1);
        await TradeSteps.expectTradeOpen(context, partner, false, 'The previous exchange is cancelled');
        await TradeSteps.expectLocked(context, partner, false, 'The old partner inventory is unlocked');
        await expect(partner.page.locator('#box-trade'+starter.sessionId), 'The old partner box stays open').toBeVisible();
    }

    static async runTwoInvitersTest(context)
    {
        let [first, invited, second] = await TestTradingRequests.enter(context);
        await TradeSteps.start(first, invited);
        await TradeSteps.start(second, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 2);
        for(let inviter of [first, second]){
            await expect(invited.page.locator('#box-trade'+inviter.sessionId), 'One request box per inviter').toBeVisible();
        }
    }

    static async runUnrelatedPlayerTest(context)
    {
        let [starter, partner, unrelated] = await TestTradingRequests.enter(context);
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(starter, partner, potionId, 1);
        await TradeSteps.expectOffered(context, starter, {[potionId]: 1}, 'The potion is offered');
        await TradeSteps.expectNoTradeShow([unrelated], 'The unrelated player gets no trade update');
        expect(
            await RoomMessagesRecorder.fetchMessages(unrelated.page, InventoryConst.ACTIONS.TRADE_START),
            'The unrelated player gets no request'
        ).toEqual([]);
        await expect(unrelated.page.locator(Selectors.trade.sessionBoxes), 'The unrelated player has no trade box').toHaveCount(0);
    }

    static async runMutualInvitesTest(context)
    {
        let [first, second] = await TestTradingRequests.enter(context, 2);
        await TradeSteps.start(first, second);
        await TradeSteps.start(second, first);
        await TradeSteps.waitForMessages(first, InventoryConst.ACTIONS.TRADE_START, 1);
        await TradeSteps.waitForMessages(second, InventoryConst.ACTIONS.TRADE_START, 1);
        await TradeSteps.answer(second, first);
        await TradeSteps.waitForMessages(first, InventoryConst.ACTIONS.TRADE_SHOW, 1);
        await TradeSteps.answer(first, second);
        await first.page.waitForTimeout(TradeSteps.SETTLE_MS);
        for(let player of [first, second]){
            expect(
                (await RoomMessagesRecorder.fetchMessages(player.page, InventoryConst.ACTIONS.TRADE_SHOW)).length,
                'The crossed second accept is refused, one trade box update for '+player.playerName
            ).toBe(1);
        }
        await TradeSteps.expectTradeOpen(context, second, true, 'The first accepted trade stays open');
        expect((await TradeSteps.fetchState(context, first)).trade.ownersIds, 'The trade started by the first accept')
            .toEqual({A: first.sessionId, B: second.sessionId});
        let potionId = await TradeSteps.fetchItemId(context, first, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(first, second, potionId, 1);
        await TradeSteps.expectOffered(context, first, {[potionId]: 1}, 'The first player offers from its own side');
    }

    static async runStaleInviteTest(context)
    {
        let [inviter, oldInvited, newInviter] = await TestTradingRequests.enter(context);
        await TradeSteps.start(inviter, oldInvited);
        await TradeSteps.waitForMessages(oldInvited, InventoryConst.ACTIONS.TRADE_START, 1);
        await TradeSteps.open(newInviter, inviter);
        expect((await TradeSteps.fetchState(context, inviter)).invitedSessionId, 'The accepting player drops its own invite')
            .toBe(false);
        await TradeSteps.answer(oldInvited, inviter);
        await inviter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await TradeSteps.expectNoTradeShow([oldInvited], 'The old invited player can not join the live trade');
        expect((await TradeSteps.fetchState(context, inviter)).trade.ownersIds, 'The live trade is not cancelled')
            .toEqual({A: newInviter.sessionId, B: inviter.sessionId});
        await TradeSteps.close(inviter, newInviter);
        await TradeSteps.expectTradeOpen(context, newInviter, false, 'The trade is closed');
        await TradeSteps.answer(oldInvited, inviter);
        await inviter.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await TradeSteps.expectNoTradeShow([oldInvited], 'The old invite starts nothing once the trade is closed');
        for(let player of [inviter, newInviter]){
            await TradeSteps.expectTradeOpen(context, player, false, 'No exchange is restarted for '+player.playerName);
        }
    }

    static async runAcceptWhileTradingTest(context)
    {
        let [newInviter, invited, oldPartner] = await TestTradingRequests.enter(context);
        await TradeSteps.enableNewExchangeCancelsActive(context);
        await TradeSteps.open(oldPartner, invited);
        await TestTradingRequests.clearMessages([newInviter, invited, oldPartner]);
        await TradeSteps.open(newInviter, invited);
        await TradeSteps.expectTradeOpen(context, oldPartner, false, 'The old trade ends');
        await TradeSteps.expectLocked(context, oldPartner, false, 'The old partner inventory is unlocked');
    }

    static run()
    {
        test.describe('Trading Requests', () => {
            test('double accept and an accept by a player not invited are rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runDoubleAcceptTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('accept after the inviter left is rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runInviterLeftTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('trade with oneself or a missing session sends nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runSelfAndMissingTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('a player in a trade inviting another player is refused and its open trade stays', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runTradingPlayerInviteRefusedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('an invite to a player in a trade is refused and its trade stays', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runInviteToTradingPlayerRefusedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('with the new exchange cancel on a new trade cancels the open exchange and the old box stays', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runNewTradeCancelsPreviousTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two inviters give one request box each', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runTwoInvitersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unrelated player gets no trade message or box', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runUnrelatedPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('crossed invites both accepted give one consistent trade', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runMutualInvitesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('a player that accepts another invite drops its own invite, the old invited player can not join or cancel the trade', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runStaleInviteTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('with the new exchange cancel on accepting another invite ends the old trade', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runAcceptWhileTradingTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTradingRequests.run();
