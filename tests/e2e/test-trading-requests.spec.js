/**
 *
 * Reldens - Test Trading Requests
 *
 * Tests the trade requests with more than two players or crossed between two players (TradeSteps: the trade messages
 * sent as a client sends them, the trade messages each client received and the live trade state of each player): a
 * second accept of the same invite and an accept by a player that was not invited are rejected; an accept after the
 * inviter left the room is rejected and the server keeps opening trades; a trade with oneself or with a missing session
 * sends nothing; starting a new trade cancels the open exchange while the box of the old partner stays open; two
 * players inviting the same player give one request box per inviter; an unrelated player gets no trade message or box;
 * two players that invite each other and both accept get one consistent trade (the offer is sent once both players got
 * the trade box of both accepts, each accept starts the same exchange again); and a player in a trade that accepts
 * another invite ends the old trade for its old partner.
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

    static async runNewTradeCancelsPreviousTest(context)
    {
        let [starter, partner, newPartner] = await TestTradingRequests.enter(context);
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
        await TradeSteps.answer(first, second);
        await TradeSteps.waitForMessages(first, InventoryConst.ACTIONS.TRADE_SHOW, 2);
        await TradeSteps.waitForMessages(second, InventoryConst.ACTIONS.TRADE_SHOW, 2);
        let potionId = await TradeSteps.fetchItemId(context, first, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(first, second, potionId, 1);
        await TradeSteps.expectOffered(context, first, {[potionId]: 1}, 'The first player offers from its own side');
    }

    static async runAcceptWhileTradingTest(context)
    {
        let [newInviter, invited, oldPartner] = await TestTradingRequests.enter(context);
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
            test('new trade cancels the open exchange and the old box stays', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
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
            test('accepting another invite ends the old trade', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingRequests.runAcceptWhileTradingTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTradingRequests.run();
