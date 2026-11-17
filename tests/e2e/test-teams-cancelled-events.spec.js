/**
 *
 * Reldens - Test Teams Cancelled Events
 *
 * Tests the team and clan flows when a server listener cancels one of their events (TeamSteps.cancelEvent sets the event
 * flag false for the group, the events are server wide so the spec runs in the exclusive group, TeamSteps records the
 * room messages and the chat of every client and the clan cases wait for the cancelled run of the event): a cancelled
 * team invite start sends no invite and keeps none pending; a cancelled team creation forms no team and the invite is
 * already consumed; a cancelled team join does not add the player to the existing team; a cancelled team players update
 * keeps the joined player in the server team but sends no team update and no accepted line; a cancelled team disband
 * keeps the team of the owner, with no players, in the server; a cancelled clan invite start sends no invite; a cancelled
 * clan join stores no membership and restores the invite; a cancelled clan players update keeps the stored member but
 * sends no clan update and no accepted line; a cancelled clan disband deletes the memberships but keeps the clan row;
 * cancelled updates after a clan leave or a disconnection send the remaining owner no clan update; a cancelled clan
 * enrich on a login leaves the member out of its clan with no panel; and a cancelled enrich update connects the member
 * but sends no clan update.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ClanSteps } = require('./helpers/clan-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { TeamsConst } = require('../../lib/teams/constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeamsCancelledEvents
{

    static SETTLE_MS = 1500;

    static async enter(context, eventName, flagKey, playersCount = 2)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await TeamSteps.cancelEvent(context, eventName, flagKey);
        return players;
    }

    static async inviteAndAccept(context, owner, invited)
    {
        await TeamSteps.invite(owner, invited);
        await TeamSteps.waitForInvite(context.gameConfig, owner, invited);
        await TeamSteps.answer(invited, owner, TeamSteps.ACCEPT);
        await invited.page.waitForTimeout(TestTeamsCancelledEvents.SETTLE_MS);
    }

    static async fetchPendingInvites(gameConfig, owner)
    {
        return (await TeamSteps.fetchState(gameConfig)).pendingInvites[owner.playerId] || [];
    }

    static async runInviteStartCancelledTest(context)
    {
        let players = await TestTeamsCancelledEvents.enter(context, 'reldens.tryTeamStart', 'continueStart');
        await TeamSteps.invite(players[0], players[1]);
        await players[1].page.waitForTimeout(TestTeamsCancelledEvents.SETTLE_MS);
        expect(await TeamSteps.fetchMessages(players[1], TeamsConst.ACTIONS.TEAM_INVITE), 'No invite is sent').toEqual([]);
        expect(
            await TestTeamsCancelledEvents.fetchPendingInvites(context.gameConfig, players[0]),
            'No invite is pending'
        ).toEqual([]);
    }

    static async runTeamCreateCancelledTest(context)
    {
        let players = await TestTeamsCancelledEvents.enter(context, 'reldens.beforeTeamCreate', 'continueBeforeCreate');
        await TestTeamsCancelledEvents.inviteAndAccept(context, players[0], players[1]);
        await TeamSteps.expectTeams(context.gameConfig, [], 'No team is formed');
        expect(
            await TestTeamsCancelledEvents.fetchPendingInvites(context.gameConfig, players[0]),
            'The invite is consumed'
        ).toEqual([]);
    }

    static async runTeamJoinCancelledTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 5, context.longRun));
        let players = await TeamSteps.enterPlayers(context, 3);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[2]]);
        await TeamSteps.cancelEvent(context, 'reldens.beforeTeamJoin', 'continueBeforeJoin');
        await TestTeamsCancelledEvents.inviteAndAccept(context, players[0], players[1]);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds([players[0], players[2]])]],
            'The player is not added to the team'
        );
        expect(await TeamSteps.fetchMessages(players[1], TeamsConst.ACTIONS.TEAM_UPDATE), 'No update for the player')
            .toEqual([]);
    }

    static async runPlayersUpdateCancelledTest(context)
    {
        let players = await TestTeamsCancelledEvents.enter(
            context,
            'reldens.beforeTeamUpdatePlayers',
            'continueBeforeJoinUpdate'
        );
        await TestTeamsCancelledEvents.inviteAndAccept(context, players[0], players[1]);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players)]],
            'The joined player is in the server team'
        );
        for(let player of players){
            expect(await TeamSteps.fetchMessages(player, TeamsConst.ACTIONS.TEAM_UPDATE), 'No team update').toEqual([]);
        }
        expect(await ChatSteps.fetchTexts(players[0].page, ChatConst.TYPES.TEAMS), 'No accepted line').toEqual([]);
    }

    static async runDisbandCancelledTest(context)
    {
        let players = await TestTeamsCancelledEvents.enter(context, 'reldens.beforeTeamDisband', 'continueDisband');
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, []]], 'The team is not deleted');
    }

    static async enterClan(context, membersCount, eventName, flagKey)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 6, context.longRun));
        let entered = await ClanSteps.enterWithClan(context, 2, membersCount);
        entered.cancelledCount = await TeamSteps.cancelEvent(context, eventName, flagKey);
        entered.eventName = eventName;
        for(let player of entered.players){
            await RoomMessagesRecorder.start(player.page);
        }
        return entered;
    }

    static async expectNoClanUpdates(players)
    {
        for(let player of players){
            expect(await TeamSteps.fetchMessages(player, TeamsConst.ACTIONS.CLAN_UPDATE), 'No clan update').toEqual([]);
        }
    }

    static async runClanInviteCancelledTest(context)
    {
        let entered = await TestTeamsCancelledEvents.enterClan(context, 0, 'reldens.tryClanStart', 'continueStart');
        await ClanSteps.invite(entered.players[0], entered.players[1]);
        await TeamSteps.waitForCancelled(context, entered.eventName, entered.cancelledCount);
        expect(await TeamSteps.fetchMessages(entered.players[1], TeamsConst.ACTIONS.CLAN_INVITE), 'No invite').toEqual([]);
        expect((await ClanSteps.fetchClans(context.gameConfig))[entered.clanId].pendingInvites, 'None pending').toEqual([]);
    }

    static async runClanJoinCancelledTest(context)
    {
        let entered = await TestTeamsCancelledEvents.enterClan(context, 0, 'reldens.beforeClanJoin', 'continueBeforeJoin');
        let [owner, invited] = entered.players;
        await ClanSteps.join(context.gameConfig, owner, invited, entered.clanId, [owner.playerId]);
        await TeamSteps.waitForCancelled(context, entered.eventName, entered.cancelledCount);
        expect(await ClanSteps.fetchStoredMemberships(context.gameConfig, invited.playerId), 'No membership').toEqual([]);
        expect((await ClanSteps.fetchClans(context.gameConfig))[entered.clanId].pendingInvites, 'The invite is restored')
            .toEqual([invited.playerId]);
    }

    static async runClanUpdateCancelledTest(context)
    {
        let entered = await TestTeamsCancelledEvents.enterClan(
            context,
            0,
            'reldens.beforeClanUpdatePlayers',
            'continueBeforeJoinUpdate'
        );
        let [owner, invited] = entered.players;
        await ClanSteps.join(context.gameConfig, owner, invited, entered.clanId, TeamSteps.sortedIds(entered.players));
        await TeamSteps.waitForCancelled(context, entered.eventName, entered.cancelledCount);
        expect((await ClanSteps.fetchStoredMemberships(context.gameConfig, invited.playerId)).length, 'Stored').toBe(1);
        await TestTeamsCancelledEvents.expectNoClanUpdates(entered.players);
        expect(await ChatSteps.fetchTexts(owner.page, ChatConst.TYPES.TEAMS), 'No accepted line').toEqual([]);
    }

    static async runClanDisbandCancelledTest(context)
    {
        let entered = await TestTeamsCancelledEvents.enterClan(context, 1, 'reldens.beforeClanDisband', 'continueDisband');
        await ClanSteps.leave(entered.players[0], entered.clanId);
        await TeamSteps.waitForCancelled(context, entered.eventName, entered.cancelledCount);
        for(let player of entered.players){
            expect(await ClanSteps.fetchStoredMemberships(context.gameConfig, player.playerId), 'Deleted').toEqual([]);
        }
        expect(await ClanSteps.fetchStoredClans(context.gameConfig, {id: entered.clanId}), 'The clan row is kept')
            .toHaveLength(1);
    }

    static async runClanLeaveUpdateCancelledTest(context, eventName, leaveMember)
    {
        let entered = await TestTeamsCancelledEvents.enterClan(context, 1, eventName, 'continueLeave');
        let [owner, member] = entered.players;
        await leaveMember(member, entered.clanId);
        await TeamSteps.waitForCancelled(context, entered.eventName, entered.cancelledCount);
        await ClanSteps.expectConnected(context.gameConfig, entered.clanId, [owner], 'Only the owner is connected');
        await TestTeamsCancelledEvents.expectNoClanUpdates([owner]);
    }

    static async runClanEnrichCancelledTest(context, eventName, connectedPlayers)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        let seeded = await ClanSteps.seedGroupClan(context, 0, [0, 1]);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        let owner = Object.assign({page: context.page}, seeded.players[0]);
        await RoomMessagesRecorder.start(owner.page);
        let cancelledCount = await TeamSteps.cancelEvent(context, eventName, 'continueProcess');
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await TeamSteps.waitForCancelled(context, eventName, cancelledCount);
        await ClanSteps.expectConnected(context.gameConfig, seeded.clanId, connectedPlayers(seeded.players), 'Connected');
        await TestTeamsCancelledEvents.expectNoClanUpdates([owner]);
        await expect(context.secondPage.locator(Selectors.clans.container), 'The member gets no clan panel').toHaveCount(0);
    }

    static run()
    {
        test.describe('Teams Cancelled Events', () => {
            test('cancelled invite start sends no invite and keeps none pending', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runInviteStartCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled team creation forms no team and consumes the invite', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runTeamCreateCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled join does not add the player to the team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runTeamJoinCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled players update sends no update and no accepted line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runPlayersUpdateCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled disband keeps the team in the server', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runDisbandCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled clan invite start sends no clan invite', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanInviteCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled clan join stores no membership and restores the invite', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanJoinCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled clan players update sends no clan update and no accepted line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanUpdateCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled clan disband keeps the clan row', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanDisbandCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled update after a clan leave sends the owner no clan update', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanLeaveUpdateCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, 'reldens.clanLeaveAfterSendUpdate', (member, clanId) => ClanSteps.leave(member, clanId));
            });
            test('cancelled update after a clan disconnection sends the owner no clan update', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanLeaveUpdateCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, 'reldens.clanDisconnectAfterSendUpdate', (member) => member.page.reload());
            });
            test('cancelled clan enrich leaves the member out of its clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanEnrichCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, 'reldens.beforeEnrichPlayerWithClan', (players) => players.slice(0, 1));
            });
            test('cancelled clan enrich update connects the member with no clan update', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsCancelledEvents.runClanEnrichCancelledTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, 'reldens.beforeEnrichPlayerWithClanUpdate', (players) => players.slice(0, 2));
            });
        });
    }

}

TestTeamsCancelledEvents.run();
