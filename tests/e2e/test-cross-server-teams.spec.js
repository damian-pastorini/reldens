/**
 *
 * Reldens - Test Cross Server Teams
 *
 * Tests the teams of players moving to a room of another server (exclusive group, the second house on server-2 and the
 * town on server-1 set by CrossServerHouseAssignment, the players logged in the town on server-1): a team member that
 * crosses into the second house keeps its team, server-2 knows the team with the owner and the member; an owner that
 * crosses keeps the team on both servers; a member that goes to server-2 and back is in the same team on server-1 (the
 * team follows the player across servers, the #435 decision); and a team invite
 * sent on server-1 with the player id of a player that already moved to server-2 is rejected (no pending invite), like
 * a trade invite sent there with the session id that player had on server-1 (no invited session recorded).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { TeamSteps } = require('./helpers/team-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { Login } = require('./helpers/login');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerTeams
{

    static async moveFirstPlayer(context)
    {
        context.secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let [mover, owner] = await TeamSteps.enterPlayers(context, 2);
        return {mover, owner};
    }

    static async runMemberKeepsTeamTest(context)
    {
        let {mover, owner} = await TestCrossServerTeams.moveFirstPlayer(context);
        await TeamSteps.formTeam(context.gameConfig, owner, [mover]);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await TestCrossServerTeams.expectTeamOn(
            context.secondServerConfig,
            owner,
            [mover],
            'Server-2 knows the team of the member that moved there'
        );
    }

    static async expectTeamOn(serverConfig, owner, members, message)
    {
        await expect.poll(
            async () => (await TeamSteps.fetchState(serverConfig)).teams?.[owner.playerId]?.playersIds || [],
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(TeamSteps.sortedIds([owner, ...members]));
    }

    static async runOwnerMovesTest(context)
    {
        let {mover, owner} = await TestCrossServerTeams.moveFirstPlayer(context);
        await TeamSteps.formTeam(context.gameConfig, mover, [owner]);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await TestCrossServerTeams.expectTeamOn(
            context.secondServerConfig,
            mover,
            [owner],
            'Server-2 knows the team of the owner that moved there'
        );
        await TestCrossServerTeams.expectTeamOn(
            context.gameConfig,
            mover,
            [owner],
            'The member on server-1 keeps the team of the owner that moved to server-2'
        );
    }

    static async runMemberReturnsTest(context)
    {
        let {mover, owner} = await TestCrossServerTeams.moveFirstPlayer(context);
        await TeamSteps.formTeam(context.gameConfig, owner, [mover]);
        let topology = await ChangePointsSteps.loadTopology(context.gameConfig);
        let serversByRoom = {
            [Login.TOWN_ROOM_NAME]: context.gameConfig,
            [CrossServerHouseAssignment.SECOND_HOUSE]: context.secondServerConfig
        };
        for(let change of ChangePointsSteps.buildRoundTrips(topology, Login.TOWN_ROOM_NAME, CrossServerHouseAssignment.SECOND_HOUSE)){
            await ChangePointsSteps.changeRoom(
                Object.assign({}, context, {gameConfig: serversByRoom[change.roomName]}),
                {page: mover.page, playerName: mover.playerName},
                topology,
                change
            );
        }
        await TestCrossServerTeams.expectTeamOn(
            context.gameConfig,
            owner,
            [mover],
            'The member back on server-1 is in the same team it kept on server-2'
        );
    }

    static async runForgedInviteTest(context)
    {
        let {mover, owner} = await TestCrossServerTeams.moveFirstPlayer(context);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await TeamSteps.invite(owner, mover);
        await owner.page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        expect(
            (await TeamSteps.fetchState(context.gameConfig)).pendingInvites?.[owner.playerId] || [],
            'Server-1 records no invite for a player that moved to server-2'
        ).not.toContain(mover.playerId);
    }

    static async runForgedTradeInviteTest(context)
    {
        let {mover, owner} = await TestCrossServerTeams.moveFirstPlayer(context);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await TradeSteps.start(owner, mover);
        await owner.page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        expect(
            (await TradeSteps.fetchState(context, owner)).invitedSessionId,
            'Server-1 records no trade invite for the session of a player that moved to server-2'
        ).toBe(false);
    }

    static run()
    {
        test.describe('Cross Server Teams', () => {
            test('a team member crossing into a server-2 room keeps its team there', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runMemberKeepsTeamTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a team owner crossing into a server-2 room keeps its team on both servers', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runOwnerMovesTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a team member going to server-2 and back is in the same team on server-1', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runMemberReturnsTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a trade invite on server-1 for the session of a player that moved to server-2 is rejected', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runForgedTradeInviteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a team invite on server-1 for a player that moved to server-2 is rejected', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runForgedInviteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerTeams.run();
