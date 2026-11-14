/**
 *
 * Reldens - Test Teams Scene Change
 *
 * Tests the team of the group players when a player changes the scene (TeamSteps, the team formed in the town and the
 * player placed on the change point to the forest, its room messages and chat recorded again in the new scene): a
 * member keeps the team in the new room, the server team keeps both players and the owner gets the update with that
 * member; the owner keeps the team in the new room and the member still sees it as the leader; the owner invite
 * accepted by a third player in the new room gives the owner the accepted line on its new client; the owner disband
 * closes the box of a member in another scene and gives that member the disbanded line; and a member that changed the
 * scene and then left a team of three is not added to it again on its next scene change. The cases that end with a
 * team of three disband it before the pages close, so the reset never meets the crash of a member of a team of three
 * leaving by a disconnection (ISSUE #140).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { TeamsConst } = require('../../lib/teams/constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeamsSceneChange
{

    static GROUP_NAME = 'team';
    static SETTLE_MS = 1500;

    static async enter(context, playersCount, membersCount)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 4), context.longRun));
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await TeamSteps.formTeam(context.gameConfig, players[0], players.slice(1, membersCount + 1));
        players[0].teamBox = '#box-'+TeamsConst.KEY+players[0].playerId;
        return players;
    }

    static async expectTeamLines(player, expectedLine, message)
    {
        await expect.poll(async () => await ChatSteps.fetchTexts(player.page, ChatConst.TYPES.TEAMS), {
            message,
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([expectedLine.replace('%groupName', TestTeamsSceneChange.GROUP_NAME)]);
    }

    static async runMemberSceneChangeTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 2, 1);
        await RoomMessagesRecorder.start(players[0].page);
        await TeamSteps.changeScene(context, players[1], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players)]],
            'The member keeps the team in the new room'
        );
        await TeamSteps.expectUpdateWith(players[0], players[0], players[1].playerId, 'The owner gets the member');
        await TeamSteps.expectMemberBox(players[1], players[0]);
    }

    static async runOwnerSceneChangeTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 2, 1);
        await RoomMessagesRecorder.start(players[1].page);
        await TeamSteps.changeScene(context, players[0], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players)]],
            'The owner keeps the team in the new room'
        );
        await TeamSteps.expectUpdateWith(players[1], players[0], players[0].playerId, 'The member sees the leader');
        await expect(players[1].page.locator(players[0].teamBox), 'The leader title on the member box')
            .toContainText(TeamsConst.LABELS.TEAM.LEADER_NAME_TITLE.replace('%leaderName', players[0].playerName));
        await expect(players[0].page.locator('#box-open-'+TeamsConst.KEY+players[0].playerId), 'The owner box opener')
            .toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runOwnerInviteAcceptedTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 3, 1);
        await TeamSteps.changeScene(context, players[2], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.changeScene(context, players[0], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players.slice(0, 2))]],
            'The owner keeps the team in the new room'
        );
        let ownerSessionId = await players[0].page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await expect.poll(async () => (await SecurityApi.request(
            context.gameConfig,
            'GET',
            '/api/e2e/teams/owner-session?ownerId='+players[0].playerId
        )).ownerSessionId, {
            message: 'The team sends the owner messages to its new client',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toBe(ownerSessionId);
        await TeamSteps.invite(players[0], players[2]);
        await TeamSteps.waitForInvite(context.gameConfig, players[0], players[2]);
        await TeamSteps.answer(players[2], players[0], TeamSteps.ACCEPT);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players)]],
            'The third player joins the team'
        );
        await TestTeamsSceneChange.expectTeamLines(
            players[0],
            TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED.replace('%playerName', players[2].playerName),
            'The owner gets the accepted line on its new client'
        );
        await TestTeamsSceneChange.disbandTeam(context, players[0]);
    }

    static async disbandTeam(context, owner)
    {
        await RoomMessagesRecorder.sendMessage(owner.page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [], 'The owner disbands the team of three before the pages close');
    }

    static async runDisbandOtherSceneTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 2, 1);
        await TeamSteps.changeScene(context, players[1], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.expectMemberBox(players[1], players[0]);
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [], 'The team is disbanded');
        await expect.poll(
            async () => (await TeamSteps.fetchMessages(players[1], TeamsConst.ACTIONS.TEAM_LEFT)).length,
            {message: 'The member in another scene gets the left message', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await expect(players[1].page.locator(players[0].teamBox), 'The member box is closed')
            .toHaveCount(0, {timeout: TimeConstants.SERVER_RESPONSE});
        await TestTeamsSceneChange.expectTeamLines(
            players[1],
            TeamsConst.CHAT.MESSAGE.DISBANDED.replace('%playerName', players[0].playerName),
            'The member in another scene gets the disbanded line'
        );
    }

    static async runClosedBoxNotRecreatedTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 2, 1);
        await TeamSteps.expectMemberBox(players[1], players[0]);
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [], 'The team is disbanded');
        await expect(players[1].page.locator(players[0].teamBox), 'The member box is closed')
            .toHaveCount(0, {timeout: TimeConstants.SERVER_RESPONSE});
        await TeamSteps.changeScene(context, players[1], Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await expect(players[1].page.locator(players[0].teamBox), 'The closed box is not created again in a new scene')
            .toHaveCount(0);
    }

    static async runLeftMemberNotAddedTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 3, 2);
        let member = players[1];
        await TeamSteps.changeScene(context, member, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players)]],
            'The member keeps the team in the new room'
        );
        await RoomMessagesRecorder.sendMessage(member.page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        let remainingTeam = [[players[0].playerId, TeamSteps.sortedIds([players[0], players[2]])]];
        await TeamSteps.expectTeams(context.gameConfig, remainingTeam, 'The member left the team');
        await TeamSteps.changeScene(context, member, Login.FOREST_ROOM_NAME, Login.TOWN_ROOM_NAME);
        await member.page.waitForTimeout(TestTeamsSceneChange.SETTLE_MS);
        await TeamSteps.expectTeams(context.gameConfig, remainingTeam, 'The member is not added again');
        await expect(member.page.locator(players[0].teamBox), 'The member has no team box').toHaveCount(0);
    }

    static async runTeamDeletedInTransitTest(context)
    {
        let players = await TestTeamsSceneChange.enter(context, 2, 1);
        let member = players[1];
        let joinGate = {isHeld: true};
        await member.page.route('**/matchmake/*/'+Login.FOREST_ROOM_NAME, async (route) => {
            await expect.poll(() => joinGate.isHeld, {timeout: TimeConstants.ROOM_TRANSITION}).toBe(false);
            await route.continue();
        });
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            member.page,
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            Login.FOREST_ROOM_NAME
        );
        expect(placed.position, 'The member is placed on the change point to the forest: '+placed.error).toBeTruthy();
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, [players[0].playerId]]],
            'The member is out of the team while it changes the scene'
        );
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [], 'The owner deletes the team');
        joinGate.isHeld = false;
        await Navigation.waitForRoom(member.page, Login.FOREST_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        await member.page.waitForTimeout(TestTeamsSceneChange.SETTLE_MS);
        await TeamSteps.expectTeams(context.gameConfig, [], 'The member arrives with no team');
        await expect(member.page.locator(players[0].teamBox), 'The member has no team box').toHaveCount(0);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, member.playerName)).scene,
            'The member plays in the forest'
        ).toBe(Login.FOREST_ROOM_NAME);
    }

    static async runUpdateBeforeUiSceneTest(context)
    {
        let gameConfig = context.gameConfig;
        let players = await TestTeamsSceneChange.enter(context, 2, 1);
        let lateMember = {playerName: gameConfig.e2ePlayerName3};
        lateMember.playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: lateMember.playerName});
        let seeded = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/teams/changing-room-record', {
            playerId: lateMember.playerId,
            teamId: players[0].playerId
        });
        expect(seeded.record.teamId, 'The scene change record of the logged out player is seeded').toBe(players[0].playerId);
        lateMember.page = (await Login.openClientPage(context.page, gameConfig)).clientPage;
        await Login.loginRootPlayer(lateMember.page, gameConfig, context.longRun, '3');
        await TeamSteps.expectTeams(
            gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds([...players, lateMember])]],
            'The player joins its team again on its login'
        );
        await TeamSteps.expectMemberBox(lateMember, players[0]);
        await TestTeamsSceneChange.disbandTeam(context, players[0]);
    }

    static run()
    {
        test.describe('Teams Scene Change', () => {
            test('member changing the scene keeps the team and the owner is updated', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runMemberSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner changing the scene keeps the team and stays the leader', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runOwnerSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner invite accepted after its scene change gives it the accepted line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runOwnerInviteAcceptedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner disband reaches the member in another scene', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runDisbandOtherSceneTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team box closed by the disband is not created again in the next new scene', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runClosedBoxNotRecreatedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member that changed the scene and left is not added again', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runLeftMemberNotAddedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team deleted while the member changes the scene leaves it with no team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runTeamDeletedInTransitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team update received before the UI scene exists shows the box once the scene is created', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsSceneChange.runUpdateBeforeUiSceneTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeamsSceneChange.run();
