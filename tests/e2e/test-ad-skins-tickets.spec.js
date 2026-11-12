/**
 *
 * Reldens - Test Ad Skins Tickets
 *
 * Tests the skin tickets with the skin ad start and end messages a client sends (exclusive group, the skin ad enabled
 * and the tickets seeded by SkinSteps, the inventory and played ads rows of the group players preserved and restored by
 * the group reset): with two tickets every rewarded skin ad consumes one ticket, deletes the consumed ticket row and
 * stores the play as ended, and the second ad is rewarded too; a ticket trashed while the ad plays ends the ad with no
 * skin item; two ticket uses sent at once give one skin item at most; and the ticket use of a player plays its skin ad
 * on its own client only, the other player in the room gets no skin ad request and keeps its ticket.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { SkinSteps } = require('./helpers/skin-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { InventoryConst } = require('../../lib/inventory/constants');
const { UsersConst } = require('../../lib/users/constants');
const { AdsConst } = require('../../lib/ads/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdSkinsTickets
{

    static QUIET_MS = 1500;

    static async runTwoTicketsTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [2]);
        let owner = skinTickets.players[0];
        let skinData = skinTickets.skinData;
        await SkinSteps.playAd(owner, skinTickets.skinAd);
        await SkinSteps.expectItems(context, owner, skinData, {tickets: 1, skins: 1}, 'The rewarded ad consumes one ticket');
        await SkinSteps.expectPlayedAd(context, owner, skinTickets.skinAd, [true], 'The rewarded ad is stored as ended');
        await SkinSteps.playAd(owner, skinTickets.skinAd);
        await SkinSteps.expectItems(context, owner, skinData, {tickets: 0, skins: 2}, 'The second ad consumes the last ticket');
        expect(
            await E2eSeedAndRestoreApi.loadInventoryRows(context.gameConfig, owner.playerName, skinData.ticketItemKey),
            'The consumed ticket row is deleted'
        ).toEqual([]);
    }

    static async runTrashedTicketTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1]);
        let owner = skinTickets.players[0];
        let skinData = skinTickets.skinData;
        await RoomMessagesRecorder.sendMessage(owner.page, {act: AdsConst.ACTIONS.AD_STARTED, ads_id: skinTickets.skinAd.id});
        await SkinSteps.expectPlayedAd(context, owner, skinTickets.skinAd, [false], 'The skin ad start is stored');
        await TradeSteps.sendItemAction(context, owner, InventoryConst.ACTIONS.REMOVE, skinData.ticketItemKey);
        await SkinSteps.expectItems(context, owner, skinData, {tickets: 0, skins: 0}, 'The ticket is trashed during the ad');
        await SkinSteps.endAdAfterMinimumDuration(owner, skinTickets.skinAd);
        await SkinSteps.expectPlayedAd(context, owner, skinTickets.skinAd, [true], 'The ad end closes the play');
        await owner.page.waitForTimeout(TestAdSkinsTickets.QUIET_MS);
        expect(
            await SkinSteps.fetchItems(context.gameConfig, owner.playerName, skinData),
            'No skin item and no ticket back without the ticket at the ad end'
        ).toEqual({tickets: 0, skins: 0});
    }

    static async runDoubleUseTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [2]);
        let owner = skinTickets.players[0];
        await AdMessagesPlayer.waitForProviderReady(owner.page, TimeConstants.UI_OPEN);
        let ticketId = await TradeSteps.fetchItemId(context, owner, skinTickets.skinData.ticketItemKey);
        let ticketUse = {act: InventoryConst.ACTIONS.USE, 'idx': ticketId};
        await RoomMessagesRecorder.sendMessages(owner.page, [ticketUse, ticketUse]);
        await AdMessagesPlayer.waitForPlayedAd(owner.page, skinTickets.skinAd, TimeConstants.UI_OPEN);
        await SkinSteps.expectItems(
            context,
            owner,
            skinTickets.skinData,
            {tickets: 1, skins: 1},
            'Two ticket uses sent at once give one skin item and consume one ticket'
        );
        await owner.page.waitForTimeout(TestAdSkinsTickets.QUIET_MS);
        expect(
            await SkinSteps.fetchItems(context.gameConfig, owner.playerName, skinTickets.skinData),
            'No second skin item arrives later'
        ).toEqual({tickets: 1, skins: 1});
    }

    static async runOtherPlayerTest(context)
    {
        let skinTickets = await SkinSteps.enterWithTickets(context, [1, 1]);
        let [owner, other] = skinTickets.players;
        let skinData = skinTickets.skinData;
        await SkinSteps.useTicketAndWaitForAd(context, owner, skinTickets);
        await SkinSteps.expectItems(context, owner, skinData, {tickets: 0, skins: 1}, 'The owner ad rewards the owner');
        expect(
            await RoomMessagesRecorder.fetchMessages(other.page, UsersConst.SKINS.ACTIONS.AD_START),
            'The other player in the room gets no skin ad request'
        ).toEqual([]);
        await expect(
            other.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR),
            'No ad plays on the other client'
        ).toHaveCount(0);
        expect(
            await SkinSteps.fetchItems(context.gameConfig, other.playerName, skinData),
            'The owner ad never consumes the other player ticket'
        ).toEqual({tickets: 1, skins: 0});
    }

    static run()
    {
        test.describe('Ad Skins Tickets', () => {
            test('two tickets give two rewarded skin ads, each consuming one ticket', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsTickets.runTwoTicketsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('ticket trashed while the skin ad plays gives no skin item', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsTickets.runTrashedTicketTest({page, gameConfig, e2eGroup, longRun});
            });
            test('two ticket uses sent at once give one skin item at most', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsTickets.runDoubleUseTest({page, gameConfig, e2eGroup, longRun});
            });
            test('ticket use plays the skin ad on its own client only and never consumes the other player ticket', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsTickets.runOtherPlayerTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAdSkinsTickets.run();
