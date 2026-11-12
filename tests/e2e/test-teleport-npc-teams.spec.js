/**
 *
 * Reldens - Test Teleport NPC Teams
 *
 * Tests the clan of the group players when a member teleports to the forest through the town teleport NPC (exclusive
 * group, ClanSteps and TeleportNpcSteps, the clan formed in the town; the check runs once the teleported member left the
 * town room, the point where the room removal runs the clan disconnect): the member stays connected to its clan with
 * the clan modifier applied once, keeps its clan panel and the owner still sees it connected. A team member or owner
 * teleport disbands the team instead (the teleport never stores the changing room record, ISSUE #351).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ClanSteps } = require('./helpers/clan-steps');
const { TeleportNpcSteps } = require('./helpers/teleport-npc-steps');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;

class TestTeleportNpcTeams
{

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
        });
    }

}

TestTeleportNpcTeams.run();
