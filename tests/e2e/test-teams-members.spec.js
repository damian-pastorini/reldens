/**
 *
 * Reldens - Test Teams Members
 *
 * Tests the team membership changes between the group players in their scene (TeamSteps, the team messages sent like
 * a client does, the live teams of the server and the team chat lines and stored rows): an accept while in another
 * team leaves it first and an inviter in another team leaves it when its invite is accepted; a third member is
 * announced to the others and the owner gets the accepted line; an unrelated player gets no team update; two invites
 * accepted at once make one team of three and two crossed invites one consistent team; the owner disband closes every
 * box with the disbanded line; a member leaving a team of two disbands it with the not enough players line and leaving
 * a team of three keeps the others; a member of a team of three accepting
 * another invite keeps the server running; the owner removing the only member disbands the team; a leave from a
 * player with no team changes nothing; a reload of the member of a team of two ends it and closes the owner box (a
 * member of a team of three leaving by a disconnection crashes, ISSUE #140); a team is not restored after both
 * players log in again; and the team chat lines are stored with the teams type.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ChatConst } = require('../../lib/chat/constants');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeamsMembers
{

    static SETTLE_MS = 1500;
    static TEAM_GROUP = 'team';

    static async enter(context, playersCount = 3)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        return await TeamSteps.enterPlayers(context, playersCount);
    }

    static teamLine(chatLine, playerName)
    {
        return chatLine.replace('%playerName', playerName).replace('%groupName', TestTeamsMembers.TEAM_GROUP);
    }

    static async expectTeamLines(player, expectedLines, message)
    {
        await expect.poll(async () => await ChatSteps.fetchTexts(player.page, ChatConst.TYPES.TEAMS), {
            message,
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual(expectedLines);
    }

    static async leave(player, removeId = false)
    {
        let message = {act: false === removeId ? TeamsConst.ACTIONS.TEAM_LEAVE : TeamsConst.ACTIONS.TEAM_REMOVE};
        if(false !== removeId){
            message.remove = String(removeId);
        }
        await RoomMessagesRecorder.sendMessage(player.page, message);
    }

    static async runSwitchTeamsTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await TeamSteps.formTeam(context.gameConfig, players[2], [players[1]]);
        await TeamSteps.expectTeams(context.gameConfig, [[players[2].playerId, TeamSteps.sortedIds([players[1], players[2]])]], 'The member left its old team first');
        expect((await TeamSteps.fetchMessages(players[0], TeamsConst.ACTIONS.TEAM_LEFT)).length, 'The old owner box is closed').toBeGreaterThan(0);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds([players[0], players[1]])]], 'The new owner team');
    }

    static async runThirdMemberTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1], players[2]]);
        await TestTeamsMembers.expectTeamLines(players[0], [
            TestTeamsMembers.teamLine(TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED, players[1].playerName),
            TestTeamsMembers.teamLine(TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED, players[2].playerName)
        ], 'The owner gets each accepted line');
        await TestTeamsMembers.expectTeamLines(players[1], [
            TestTeamsMembers.teamLine(TeamsConst.CHAT.MESSAGE.ENTER, players[2].playerName)
        ], 'The other member gets the enter line');
        let stored = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'chat', {
            player_id: players[2].playerId,
            message_type: ChatConst.TYPES.TEAMS
        });
        expect(stored.length, 'The team lines are stored with the teams type').toBeGreaterThan(0);
    }

    static async runUnrelatedPlayerTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await players[2].page.waitForTimeout(TestTeamsMembers.SETTLE_MS);
        expect(await TeamSteps.fetchMessages(players[2], TeamsConst.ACTIONS.TEAM_UPDATE), 'The unrelated player gets no update').toEqual([]);
    }

    static async runSimultaneousInvitesTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.invite(players[0], players[2]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[2]);
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TeamSteps.answer(players[2], players[0], TeamSteps.ACCEPT);
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds(players)]], 'One team of three');
    }

    static async runCrossedInvitesTest(context)
    {
        let players = await TestTeamsMembers.enter(context, 2);
        await TeamSteps.invite(players[0], players[1]);
        await TeamSteps.invite(players[1], players[0]);
        await TeamSteps.waitForInvite(context.gameConfig, players[1], players[0]);
        await TeamSteps.answer(players[1], players[0], TeamSteps.ACCEPT);
        await TeamSteps.answer(players[0], players[1], TeamSteps.ACCEPT);
        await new Promise(resolve => setTimeout(resolve, TestTeamsMembers.SETTLE_MS));
        let teams = (await TeamSteps.fetchState(context.gameConfig)).teams;
        expect(Object.keys(teams).map(ownerId => teams[ownerId].playersIds), 'One consistent team').toEqual([TeamSteps.sortedIds(players)]);
    }

    static async runOwnerDisbandTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1], players[2]]);
        await TestTeamsMembers.leave(players[0]);
        await TeamSteps.expectTeams(context.gameConfig, [], 'The team is disbanded');
        for(let player of players){
            await expect(player.page.locator('#box-'+TeamsConst.KEY+players[0].playerId), 'Every box is closed').toHaveCount(0, {
                timeout: TimeConstants.SERVER_RESPONSE
            });
            await expect.poll(async () => await ChatSteps.fetchTexts(player.page, ChatConst.TYPES.TEAMS), {timeout: TimeConstants.SERVER_RESPONSE})
                .toContain(TestTeamsMembers.teamLine(TeamsConst.CHAT.MESSAGE.DISBANDED, players[0].playerName));
        }
    }

    static async runMemberLeavesTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1], players[2]]);
        await TestTeamsMembers.leave(players[1]);
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds([players[0], players[2]])]], 'The others stay');
    }

    static async runTwoPlayersLeaveTest(context)
    {
        let players = await TestTeamsMembers.enter(context, 2);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await ChatSteps.recordChat(players[1].page);
        await TestTeamsMembers.leave(players[1]);
        await TeamSteps.expectTeams(context.gameConfig, [], 'The team of two is disbanded');
        for(let player of players){
            expect((await TeamSteps.fetchMessages(player, TeamsConst.ACTIONS.TEAM_LEFT)).length, 'Both clients leave').toBeGreaterThan(0);
        }
        await expect.poll(async () => await ChatSteps.fetchTexts(players[1].page, ChatConst.TYPES.TEAMS), {timeout: TimeConstants.SERVER_RESPONSE})
            .toContain(TeamsConst.CHAT.MESSAGE.NOT_ENOUGH_PLAYERS);
    }

    static async runOwnerRemovesOnlyMemberTest(context)
    {
        let players = await TestTeamsMembers.enter(context, 2);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await TestTeamsMembers.leave(players[0], players[1].playerId);
        await TeamSteps.expectTeams(context.gameConfig, [], 'Removing the only member disbands the team');
    }

    static async runThirdMemberSwitchTest(context)
    {
        let players = await TestTeamsMembers.enter(context);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1], players[2]]);
        await TeamSteps.invite(players[2], players[1]);
        await TeamSteps.waitForInvite(context.gameConfig, players[2], players[1]);
        await TeamSteps.answer(players[1], players[2], TeamSteps.ACCEPT);
        await new Promise(resolve => setTimeout(resolve, TestTeamsMembers.SETTLE_MS));
        let state = await TeamSteps.fetchState(context.gameConfig);
        expect(state.error, 'The server keeps answering').toBeUndefined();
    }

    static async runNoTeamLeaveTest(context)
    {
        let players = await TestTeamsMembers.enter(context, 2);
        await TestTeamsMembers.leave(players[0]);
        await TestTeamsMembers.leave(players[0], players[1].playerId);
        await players[0].page.waitForTimeout(TestTeamsMembers.SETTLE_MS);
        await TeamSteps.expectTeams(context.gameConfig, [], 'Nothing happens');
        expect(await TeamSteps.fetchMessages(players[0], TeamsConst.ACTIONS.TEAM_LEFT), 'No left message').toEqual([]);
    }

    static async runReloadAndReloginTest(context)
    {
        let players = await TestTeamsMembers.enter(context, 2);
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        await players[1].page.reload();
        await TeamSteps.expectTeams(context.gameConfig, [], 'The reloaded member ends the team of two');
        await expect(players[0].page.locator('#box-'+TeamsConst.KEY+players[0].playerId), 'The owner box closes').toHaveCount(0, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
        await Login.loginRootPlayer(players[1].page, context.gameConfig, context.longRun, '2');
        await TeamSteps.formTeam(context.gameConfig, players[0], [players[1]]);
        for(let player of players){
            await player.page.reload();
        }
        await TeamSteps.expectTeams(context.gameConfig, [], 'Both players gone');
        await Login.loginRootPlayer(players[0].page, context.gameConfig, context.longRun);
        await Login.loginRootPlayer(players[1].page, context.gameConfig, context.longRun, '2');
        await players[1].page.waitForTimeout(TestTeamsMembers.SETTLE_MS);
        await TeamSteps.expectTeams(context.gameConfig, [], 'No team is restored');
        await expect(players[1].page.locator('[id^="box-'+TeamsConst.KEY+'"]'), 'No box is restored').toHaveCount(0);
    }

    static run()
    {
        test.describe('Teams Members', () => {
            test('accept while in another team and inviter in another team leave it first', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runSwitchTeamsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('third member is announced and the owner gets the accepted lines', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runThirdMemberTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('unrelated player gets no team update', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runUnrelatedPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two invites accepted at once make one team of three', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runSimultaneousInvitesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('crossed invites both accepted make one consistent team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runCrossedInvitesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner disband closes every box with the disbanded line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runOwnerDisbandTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member leaving a team of three keeps the others', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runMemberLeavesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member leaving a team of two disbands it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runTwoPlayersLeaveTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner removing the only member disbands the team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runOwnerRemovesOnlyMemberTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member of a team of three accepting another invite keeps the server running', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runThirdMemberSwitchTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('leave from a player with no team changes nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runNoTeamLeaveTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member reload closes the owner box and no team is restored after new logins', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsMembers.runReloadAndReloginTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeamsMembers.run();
