/**
 *
 * Reldens - Test Cross Server Teams
 *
 * Tests the teams of players moving to a room of another server (exclusive group, the second house on server-2 and the
 * town on server-1 set by CrossServerHouseAssignment, the players logged in the town on server-1): a team member that
 * crosses into the second house keeps its team, server-2 knows the team with the owner and the member; an owner that
 * crosses keeps the team on both servers; a member that goes to server-2 and back is in the same team on server-1 (the
 * team follows the player across servers, the #435 decision); the stats changes of the owner on server-1 send server-2
 * one queued update with the life of the moment it is sent, never the lives between (the server-1 sync interval held
 * for the group, so every change falls in one interval), and a server-2 that does not answer an update (its signed
 * tokens secret changed) gets its members dropped from the server-1 team until the next answered update adds them
 * again (ISSUE #484); and a team invite
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
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { LoginServerApi } = require('./helpers/login-server-api');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerTeams
{

    static TEAMS_SYNC_PATH = 'teams/package/teamCrossServerStateSync';
    static HELD_UPDATE_INTERVAL_MS = 4000;
    static LOWERED_POINTS = [1, 2, 3];

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

    static async moveTeamMember(context)
    {
        let moved = await TestCrossServerTeams.moveFirstPlayer(context);
        await TeamSteps.formTeam(context.gameConfig, moved.owner, [moved.mover]);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await TestCrossServerTeams.expectTeamOn(
            context.secondServerConfig,
            moved.owner,
            [moved.mover],
            'Server-2 knows the team of the member that moved there'
        );
        moved.ownerLife = (await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            moved.owner.playerName
        )).life;
        return moved;
    }

    static async lowerOwnerLife(context, owner, life)
    {
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(context.gameConfig, Login.TOWN_ROOM_NAME, owner.playerName, life);
        expect(lowered.value, 'The owner life is lowered on server-1').toBe(life);
    }

    static async runQueuedStatsUpdatesTest(context)
    {
        let changed = await GameplayE2eStateApi.changeFeatureProperty(
            context.gameConfig,
            context.e2eGroup,
            TestCrossServerTeams.TEAMS_SYNC_PATH,
            'updateIntervalMs',
            TestCrossServerTeams.HELD_UPDATE_INTERVAL_MS
        );
        expect(changed.error, 'The server-1 teams sync interval is held for the group').toBeUndefined();
        let {mover, owner, ownerLife} = await TestCrossServerTeams.moveTeamMember(context);
        await RoomMessagesRecorder.start(mover.page);
        for(let loweredPoints of TestCrossServerTeams.LOWERED_POINTS){
            await TestCrossServerTeams.lowerOwnerLife(context, owner, ownerLife - loweredPoints);
        }
        let lastLife = ownerLife - TestCrossServerTeams.LOWERED_POINTS[TestCrossServerTeams.LOWERED_POINTS.length - 1];
        let fetchOwnerLives = async () => (await RoomMessagesRecorder.fetchMessages(mover.page, TeamsConst.ACTIONS.TEAM_UPDATE))
            .map(update => update.players?.[String(owner.playerId)]?.sharedProperties?.hp?.value ?? null)
            .filter(life => null !== life && ownerLife !== life);
        await expect.poll(fetchOwnerLives, {
            message: 'Server-2 gets the owner life of the moment the queued update is sent, never one update per change',
            timeout: TestCrossServerTeams.HELD_UPDATE_INTERVAL_MS + TimeConstants.SERVER_RESPONSE
        }).toEqual([lastLife]);
    }

    static async dropSecondServerMembers(context)
    {
        let moved = await TestCrossServerTeams.moveTeamMember(context);
        await TestCrossServerTeams.expectTeamOn(context.gameConfig, moved.owner, [moved.mover], 'Server-1 lists the member on server-2');
        await LoginServerApi.setSignedTokensSecret(context.secondServerConfig, true);
        await TestCrossServerTeams.lowerOwnerLife(context, moved.owner, moved.ownerLife - 1);
        await TestCrossServerTeams.expectTeamOn(
            context.gameConfig,
            moved.owner,
            [],
            'Server-1 drops the members of the server that does not answer the update'
        );
        return moved;
    }

    static async runUnansweredUpdateTest(context)
    {
        let {mover, owner} = await TestCrossServerTeams.dropSecondServerMembers(context);
        await LoginServerApi.setSignedTokensSecret(context.secondServerConfig, false);
        await TestCrossServerTeams.expectMemberBackAfterItsUpdate(
            context,
            {mover, owner},
            'The next update of the server that did not answer adds its members again'
        );
    }

    static async expectMemberBackAfterItsUpdate(context, moved, message)
    {
        await TestCrossServerTeams.lowerMoverLife(context, moved.mover);
        await TestCrossServerTeams.expectTeamOn(context.gameConfig, moved.owner, [moved.mover], message);
    }

    static async lowerMoverLife(context, mover)
    {
        let moverLife = (await GameplayE2eStateApi.fetchPlayer(
            context.secondServerConfig,
            CrossServerHouseAssignment.SECOND_HOUSE,
            mover.playerName
        )).life;
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            context.secondServerConfig,
            CrossServerHouseAssignment.SECOND_HOUSE,
            mover.playerName,
            moverLife - 1
        );
        expect(lowered.value, 'The member life is lowered on server-2').toBe(moverLife - 1);
    }

    static async runBothSidesDroppedTest(context)
    {
        let {mover, owner, ownerLife} = await TestCrossServerTeams.dropSecondServerMembers(context);
        await TestCrossServerTeams.lowerMoverLife(context, mover);
        await expect.poll(
            async () => (await TeamSteps.fetchState(context.secondServerConfig)).teams?.[owner.playerId]?.playersIds || [],
            {message: 'Server-2 drops the owner of server-1 that rejects its update', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(TeamSteps.sortedIds([mover]));
        await LoginServerApi.setSignedTokensSecret(context.secondServerConfig, false);
        await TestCrossServerTeams.lowerOwnerLife(context, owner, ownerLife - 2);
        await TestCrossServerTeams.expectMemberBackAfterItsUpdate(
            context,
            {mover, owner},
            'Once both servers answer again the next stats changes add the members of each server again'
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
            test('the stats changes of a team member send the other server one queued update with the values of that moment', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runQueuedStatsUpdatesTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a server that does not answer a team update gets its members dropped and the next answered update adds them again', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runUnansweredUpdateTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('servers that dropped each other members find them again on the next stats changes once both answer', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runBothSidesDroppedTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a team invite on server-1 for a player that moved to server-2 is rejected', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerTeams.runForgedInviteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerTeams.run();
