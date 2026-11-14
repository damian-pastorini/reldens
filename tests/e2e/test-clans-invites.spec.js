/**
 *
 * Reldens - Test Clans Invites
 *
 * Tests the clan invites between the group players in their scene (TeamSteps players, ClanSteps with the clan rows of
 * the players preserved, the first player owning a clan created by the case): the owner invites from the target box and
 * the accepted invite stores the membership, updates both panels (no create form on the member) and sends the owner the
 * accepted line while an unrelated player gets nothing; a decline from the request box consumes the invite and sends
 * the rejected line; answers with no invite, a second accept and an accept after the disband
 * are rejected; an accept while in another clan leaves it first and an owner accepting another clan disbands its own;
 * invites from a player with no clan or to itself are rejected; open invites on shows the button to a member and off hides it, the button is hidden for a member and for a
 * player with no clan; and a decline or an accept with the owner gone consume the invite.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ClanSteps } = require('./helpers/clan-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClansInvites
{

    static OPEN_INVITES_PATH = 'client/clan/general/openInvites';
    static SETTLE_MS = 1500;
    static CLAN_GROUP = 'clan';

    static async enter(context, playersCount = 2, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 3), context.longRun));
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await ClanSteps.preserveClanRows(context.gameConfig, context.e2eGroup, players);
        return {players, clanId: (await ClanSteps.createClan(players[0], 'E2eInvites'+Date.now())).id};
    }

    static clanLine(chatLine, playerName)
    {
        return chatLine.replace('%playerName', playerName).replace('%groupName', TestClansInvites.CLAN_GROUP);
    }

    static async targetPlayer(fromPlayer, targetPlayer)
    {
        await fromPlayer.page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            targetPlayer.sessionId
        );
        await fromPlayer.page.waitForTimeout(TestClansInvites.SETTLE_MS);
    }

    static clanInviteButton(targetPlayer)
    {
        return '.clan-invite-'+targetPlayer.playerId+' button';
    }

    static async runAcceptTest(context)
    {
        let entered = await TestClansInvites.enter(context, 3);
        let players = entered.players;
        await TestClansInvites.targetPlayer(players[0], players[1]);
        await players[0].page.locator(TestClansInvites.clanInviteButton(players[1])).click({timeout: TimeConstants.SERVER_RESPONSE});
        await players[1].page.locator('[id^="opt-accept-'+TeamsConst.CLAN_KEY+'"]').first().click({timeout: TimeConstants.SERVER_RESPONSE});
        await ClanSteps.expectMembers(context.gameConfig, entered.clanId, [players[0].playerId, players[1].playerId], 'The invited player joins');
        expect((await ClanSteps.fetchStoredMemberships(context.gameConfig, players[1].playerId)).map(row => Number(row.clan_id)), 'Stored')
            .toEqual([Number(entered.clanId)]);
        await expect.poll(async () => await ChatSteps.fetchTexts(players[0].page, ChatConst.TYPES.TEAMS), {timeout: TimeConstants.SERVER_RESPONSE})
            .toContain(TestClansInvites.clanLine(TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED, players[1].playerName));
        await players[1].page.click(Selectors.hud.clanOpen);
        await expect(players[1].page.locator(Selectors.clans.nameInput), 'The member gets no create form').toHaveCount(0);
        expect(await RoomMessagesRecorder.fetchMessages(players[2].page, TeamsConst.ACTIONS.CLAN_UPDATE), 'The unrelated player gets nothing')
            .toEqual([]);
        expect(await RoomMessagesRecorder.fetchMessages(players[2].page, TeamsConst.ACTIONS.CLAN_INVITE), 'No invite for the others').toEqual([]);
    }

    static async runDeclineTest(context)
    {
        let entered = await TestClansInvites.enter(context);
        let players = entered.players;
        await ClanSteps.invite(players[0], players[1]);
        await players[1].page.locator('[id^="opt-decline-'+TeamsConst.CLAN_KEY+'"]').first().click({timeout: TimeConstants.SERVER_RESPONSE});
        await expect.poll(async () => await ChatSteps.fetchTexts(players[0].page, ChatConst.TYPES.TEAMS), {timeout: TimeConstants.SERVER_RESPONSE})
            .toContain(TestClansInvites.clanLine(TeamsConst.CHAT.MESSAGE.INVITE_REJECTED, players[1].playerName));
        expect((await ClanSteps.fetchClans(context.gameConfig))[entered.clanId].pendingInvites, 'The invite is consumed').toEqual([]);
        await expect(players[1].page.locator(Selectors.clans.nameInput), 'The decliner with no clan gets the create form')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runRejectedAnswersTest(context)
    {
        let entered = await TestClansInvites.enter(context);
        let players = entered.players;
        await ClanSteps.answer(players[1], entered.clanId, ClanSteps.DECLINE);
        await ClanSteps.answer(players[1], entered.clanId, ClanSteps.ACCEPT);
        await players[1].page.waitForTimeout(TestClansInvites.SETTLE_MS);
        await ClanSteps.expectMembers(context.gameConfig, entered.clanId, [players[0].playerId], 'No answer without invite');
        await ClanSteps.join(context.gameConfig, players[0], players[1], entered.clanId, [players[0].playerId, players[1].playerId]);
        await ClanSteps.answer(players[1], entered.clanId, ClanSteps.ACCEPT);
        await players[1].page.waitForTimeout(TestClansInvites.SETTLE_MS);
        expect((await ClanSteps.fetchStoredMemberships(context.gameConfig, players[1].playerId)).length, 'One membership').toBe(1);
    }

    static async runRejectedInvitesTest(context)
    {
        let entered = await TestClansInvites.enter(context, 3);
        let players = entered.players;
        await ClanSteps.invite(players[1], players[2]);
        await ClanSteps.invite(players[0], {playerId: String(players[0].playerId)});
        await players[0].page.waitForTimeout(TestClansInvites.SETTLE_MS);
        expect((await ClanSteps.fetchClans(context.gameConfig))[entered.clanId].pendingInvites, 'No invite with no clan or to itself')
            .toEqual([]);
    }

    static async runInviteButtonTest(context, openInvites, expectedButtons)
    {
        let entered = await TestClansInvites.enter(context, 3, {[TestClansInvites.OPEN_INVITES_PATH]: openInvites});
        let players = entered.players;
        await TestClansInvites.targetPlayer(players[2], players[0]);
        await expect(players[2].page.locator(TestClansInvites.clanInviteButton(players[0])), 'No button with no clan').toHaveCount(0);
        await ClanSteps.join(context.gameConfig, players[0], players[1], entered.clanId, [players[0].playerId, players[1].playerId]);
        for(let player of players.slice(0, 2)){
            await expect(player.page.locator('.clan-member-'+players[1].playerId), 'The clan update reached '+player.playerName)
                .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
        }
        await TestClansInvites.targetPlayer(players[0], players[1]);
        await expect(players[0].page.locator(TestClansInvites.clanInviteButton(players[1])), 'No button for a member').toHaveCount(0);
        await TestClansInvites.targetPlayer(players[1], players[2]);
        await expect(players[1].page.locator(TestClansInvites.clanInviteButton(players[2])), 'The member button follows the option')
            .toHaveCount(expectedButtons);
    }

    static async runOtherClanTest(context)
    {
        let entered = await TestClansInvites.enter(context, 3);
        let players = entered.players;
        let secondClan = await ClanSteps.createClan(players[2], 'E2eSecond'+Date.now());
        await ClanSteps.join(context.gameConfig, players[0], players[1], entered.clanId, [players[0].playerId, players[1].playerId]);
        await ClanSteps.join(context.gameConfig, players[2], players[1], secondClan.id, [players[1].playerId, players[2].playerId]);
        await ClanSteps.expectMembers(context.gameConfig, entered.clanId, [players[0].playerId], 'The member left its old clan first');
        await ClanSteps.join(context.gameConfig, players[2], players[0], secondClan.id, TestClansInvites.sortedIds(players));
        expect(await ClanSteps.fetchStoredClans(context.gameConfig, {id: entered.clanId}), 'The owner own clan is disbanded').toEqual([]);
    }

    static sortedIds(players)
    {
        return players.map(player => player.playerId).sort((idA, idB) => idA - idB);
    }

    static async runOwnerGoneTest(context)
    {
        let entered = await TestClansInvites.enter(context, 3);
        let players = entered.players;
        await ClanSteps.invite(players[0], players[1]);
        await ClanSteps.invite(players[0], players[2]);
        await players[0].page.waitForTimeout(TestClansInvites.SETTLE_MS);
        await players[0].page.reload();
        await ClanSteps.answer(players[1], entered.clanId, ClanSteps.DECLINE);
        await ClanSteps.answer(players[2], entered.clanId, ClanSteps.ACCEPT);
        await players[1].page.waitForTimeout(TestClansInvites.SETTLE_MS);
        expect(await ClanSteps.fetchStoredMemberships(context.gameConfig, players[2].playerId), 'No membership with the clan unloaded')
            .toEqual([]);
        let state = await TeamSteps.fetchState(context.gameConfig);
        expect(state.error, 'The server keeps answering').toBeUndefined();
    }

    static run()
    {
        test.describe('Clans Invites', () => {
            test('accepted invite stores the membership and updates the panels', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runAcceptTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('declined invite is consumed with the rejected line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runDeclineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('answers without invite and a second accept are rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runRejectedAnswersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('invites with no clan or to itself are rejected', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runRejectedInvitesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('open invites off hides the member invite button', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runInviteButtonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, false, 0);
            });
            test('open invites on shows the member invite button', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runInviteButtonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, true, 1);
            });
            test('accept from another clan leaves it first and an owner accepting disbands its clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runOtherClanTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('decline and accept with the owner gone consume the invites', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansInvites.runOwnerGoneTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClansInvites.run();
