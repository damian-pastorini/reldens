/**
 *
 * Reldens - Test Teleport NPC Teams
 *
 * Tests the clan of the group players when a member teleports to the forest through the town teleport NPC (exclusive
 * group, ClanSteps and TeleportNpcSteps, the clan formed in the town; the check runs once the teleported member left the
 * town room, the point where the room removal runs the clan disconnect): the member stays connected to its clan with
 * the clan modifier applied once, keeps its clan panel and the owner still sees it connected. The team of the group
 * players (TeamSteps, formed in the town) is kept when a member or the owner of a team of two, or a member of a team of
 * three, teleports to the forest: once the teleported player left the town room the server team still has every
 * player and the member box shows the leader; the owner disbands the team before the pages close (ISSUE #140).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ClanSteps } = require('./helpers/clan-steps');
const { TeamSteps } = require('./helpers/team-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { TeamsConst } = require('../../lib/teams/constants');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;

class TestTeleportNpcTeams
{

    static async runTeamTeleportTest(context, playersCount, teleportedIndex)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 4), context.longRun));
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await TeamSteps.formTeam(context.gameConfig, players[0], players.slice(1));
        let teleported = players[teleportedIndex];
        let npc = await TeleportNpcSteps.openDialog(context, teleported.page);
        await TeleportNpcSteps.chooseDestination(context, teleported, npc);
        await TeamSteps.expectTeams(
            context.gameConfig,
            [[players[0].playerId, TeamSteps.sortedIds(players)]],
            'The team keeps every player once the teleported one left the town room'
        );
        await TeamSteps.expectMemberBox(players[1], players[0]);
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [], 'The owner disbands the team before the pages close');
    }

    static async runClanMemberTeleportTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 6, context.longRun));
        let entered = await ClanSteps.enterWithClan(context, 2, 1);
        let [owner, member] = entered.players;
        await TeleportNpcSteps.chooseDestination(context, member, await TeleportNpcSteps.openDialog(context, member.page));
        await ClanSteps.expectConnected(gameConfig, entered.clanId, entered.players, 'The member stays connected');
        await ClanSteps.expectMemberInNewRoom(gameConfig, owner, member, Login.FOREST_ROOM_NAME);
    }

    static run()
    {
        test.describe('Teleport NPC Teams', () => {
            test('a clan member teleported to another room stays connected to its clan', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestTeleportNpcTeams.runClanMemberTeleportTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a team member teleported to another room keeps its team', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestTeleportNpcTeams.runTeamTeleportTest({page, secondPage, gameConfig, longRun}, 2, 1);
            });
            test('a team owner teleported to another room keeps its team', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestTeleportNpcTeams.runTeamTeleportTest({page, secondPage, gameConfig, longRun}, 2, 0);
            });
            test('a member of a team of three teleported to another room keeps the whole team', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestTeleportNpcTeams.runTeamTeleportTest({page, secondPage, gameConfig, longRun}, 3, 1);
            });
        });
    }

}

TestTeleportNpcTeams.run();
