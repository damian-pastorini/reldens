/**
 *
 * Reldens - Test Trading Invites
 *
 * Tests the trade invites between the group players and their answers (TradeSteps: the trade messages sent as a client
 * sends them, the trade messages each client received and the live trade state of each player, the trade time out
 * config overridden for the group): a player that walked to the other side of the room still gets the request (there
 * is no range check); a decline from the request box closes it and sends nothing to the inviter, whose invite stays
 * until the time out; an invite past its time out cancels the exchange, a late accept is rejected and the request box of
 * the invited player stays open with no close message; with the time out wait disabled the invite stays open; an
 * accept just before the time out opens a trade the timer never cancels (a second invite sent before the first one
 * times out is cancelled by the first timer, ISSUE #153; a tampered accept after the decline still opens the trade,
 * ISSUE #157).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { ShowcaseSteps } = require('./helpers/showcase-steps');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { InventoryConst } = require('../../lib/inventory/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTradingInvites
{

    static SHORT_TIME_OUT_MS = 1000;
    static LONG_TIME_OUT_MS = 3000;

    static async enter(context, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        return await TradeSteps.enterPlayers(context, 2, [], configValues);
    }

    static async expectInvited(context, inviter, invitedSessionId, message)
    {
        await expect.poll(
            async () => (await TradeSteps.fetchState(context, inviter)).invitedSessionId,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(invitedSessionId);
    }

    static async startAndDecline(inviter, invited)
    {
        await TradeSteps.start(inviter, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 1);
        await invited.page.locator('#opt-decline-trade'+inviter.sessionId).click();
        await expect(invited.page.locator('#box-trade'+inviter.sessionId), 'The request box closes').toBeHidden();
    }

    static async runFarPlayerTest(context)
    {
        let [inviter, invited] = await TestTradingInvites.enter(context);
        let movement = await ShowcaseSteps.walkTowardMapCenter(
            invited.page,
            context.gameConfig,
            ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName,
            invited.playerName,
            ShowcaseSteps.WHOLE_WAY_TILES,
            TimeConstants.forLongRun(TimeConstants.NAVIGATION, context.longRun)
        );
        expect(movement.done,'The invited player walks to the other side of the room').toBe(true);
        await TradeSteps.start(inviter, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 1);
        await expect(invited.page.locator('#box-trade'+inviter.sessionId), 'The far player gets the request').toBeVisible();
    }

    static async runDeclineTest(context)
    {
        let [inviter, invited] = await TestTradingInvites.enter(context, {
            [TradeSteps.TIME_OUT_PATH]: TestTradingInvites.LONG_TIME_OUT_MS
        });
        await TestTradingInvites.startAndDecline(inviter, invited);
        await TestTradingInvites.expectInvited(context, inviter, invited.sessionId, 'The invite stays after the decline');
        expect(
            await RoomMessagesRecorder.fetchMessages(inviter.page, GameConst.CLOSE_UI_ACTION),
            'The inviter gets no notice'
        ).toEqual([]);
        await inviter.page.waitForTimeout(TestTradingInvites.LONG_TIME_OUT_MS);
        await TestTradingInvites.expectInvited(context, inviter, false, 'The invite ends on its time out');
    }

    static async runTimeOutTest(context)
    {
        let [inviter, invited] = await TestTradingInvites.enter(context, {
            [TradeSteps.TIME_OUT_PATH]: TestTradingInvites.SHORT_TIME_OUT_MS
        });
        await TradeSteps.start(inviter, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 1);
        await TestTradingInvites.expectInvited(context, inviter, false, 'The invite times out');
        await TradeSteps.answer(invited, inviter);
        await TradeSteps.expectNoTradeShow([inviter, invited], 'The late accept is rejected');
        await TradeSteps.expectTradeOpen(context, inviter, false, 'No trade is open');
        await expect(invited.page.locator('#box-trade'+inviter.sessionId), 'The expired request box stays').toBeVisible();
        expect(
            await RoomMessagesRecorder.fetchMessages(invited.page, GameConst.CLOSE_UI_ACTION),
            'The invited player gets no close message'
        ).toEqual([]);
    }

    static async runNoTimeOutWaitTest(context)
    {
        let [inviter, invited] = await TestTradingInvites.enter(context, {
            [TradeSteps.TIME_OUT_PATH]: TestTradingInvites.SHORT_TIME_OUT_MS,
            [TradeSteps.AWAIT_TIME_OUT_PATH]: false
        });
        await TradeSteps.start(inviter, invited);
        await TradeSteps.waitForMessages(invited, InventoryConst.ACTIONS.TRADE_START, 1);
        await inviter.page.waitForTimeout(TestTradingInvites.SHORT_TIME_OUT_MS + TradeSteps.SETTLE_MS);
        await TestTradingInvites.expectInvited(context, inviter, invited.sessionId, 'The invite stays open');
        await TradeSteps.answer(invited, inviter);
        await TradeSteps.expectTradeOpen(context, inviter, true, 'The trade opens after the time out');
    }

    static async runAcceptBeforeTimeOutTest(context)
    {
        let [inviter, invited] = await TestTradingInvites.enter(context, {
            [TradeSteps.TIME_OUT_PATH]: TestTradingInvites.LONG_TIME_OUT_MS
        });
        await TradeSteps.open(inviter, invited);
        await inviter.page.waitForTimeout(TestTradingInvites.LONG_TIME_OUT_MS + TradeSteps.SETTLE_MS);
        await TradeSteps.expectTradeOpen(context, inviter, true, 'The timer does not cancel the open trade');
        await TradeSteps.expectLocked(context, invited, true, 'The invited inventory stays locked');
    }

    static run()
    {
        test.describe('Trading Invites', () => {
            test('far player in the same room gets the request', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingInvites.runFarPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('decline closes the request box and the invite waits for its time out', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingInvites.runDeclineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('timed out invite rejects a late accept and keeps the request box', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingInvites.runTimeOutTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('invite with the time out wait disabled stays open', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingInvites.runNoTimeOutWaitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('accept before the time out is not cancelled by the timer', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingInvites.runAcceptBeforeTimeOutTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTradingInvites.run();
