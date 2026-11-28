/**
 *
 * Reldens - Test Cross Server Clans
 *
 * Tests the clans of players moving to a room of another server (exclusive group, the second house on server-2 and the
 * town on server-1 set by CrossServerHouseAssignment, the clan created in the town on server-1 with ClanSteps): a member
 * that crosses into the second house is dropped from the server-1 connected list and its panel on server-2 shows the
 * owner online; the life of that member lowered on server-2 is shown in the clan panel of the owner on server-1; a
 * member that leaves the clan on server-2 loses its stored membership and the owner on server-1 stops
 * listing it; a member logging in again on server-1 after that leave gets the stored members (the owner, not the member
 * that left); an owner that disbands the clan on server-2 sends the member on server-1 back to the create form with the
 * clan modifier reverted; and a clan invite sent on server-1 with the player id of a player that moved to server-2 is
 * rejected (no pending invite).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { ClanSteps } = require('./helpers/clan-steps');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Selectors } = require('./selectors');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerClans
{

    static CONNECTED_LINE = 'clan-player-';
    static MEMBER_LINE = 'clan-member-';
    static LIFE_PROPERTY_KEY = 'hp';

    static async enterAndMove(context, membersCount, moverIndex, playersCount = 2)
    {
        context.secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let entered = await ClanSteps.enterWithClan(context, playersCount, membersCount);
        let mover = entered.players[moverIndex];
        await CrossServerHouseAssignment.walkFromTown(
            Object.assign({}, context, {
                page: mover.page,
                gameConfig: Object.assign({}, context.gameConfig, {e2ePlayerName: mover.playerName})
            }),
            CrossServerHouseAssignment.SECOND_HOUSE
        );
        return {clanId: entered.clanId, players: entered.players, mover, stayer: entered.players[1 - moverIndex]};
    }

    static async leaveOnSecondServer(context, mover, clanId)
    {
        await ClanSteps.leave(mover, clanId);
        await expect.poll(
            async () => (await ClanSteps.fetchStoredMemberships(context.gameConfig, mover.playerId)).length,
            {message: 'The membership of the member that left on server-2 is deleted', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
    }

    static async expectPanelLines(panelPage, lineClass, player, linesCount, message)
    {
        await expect(panelPage.locator('.'+lineClass+player.playerId), message).toHaveCount(
            linesCount,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
    }

    static async runMemberMovesTest(context)
    {
        let {clanId, mover, stayer} = await TestCrossServerClans.enterAndMove(context, 1, 1);
        await ClanSteps.expectConnected(context.gameConfig, clanId, [stayer], 'Server-1 drops the member that moved');
        await TestCrossServerClans.expectPanelLines(
            mover.page,
            TestCrossServerClans.CONNECTED_LINE,
            stayer,
            1,
            'The panel of the member on server-2 shows the owner online'
        );
    }

    static async runLifeChangeTest(context)
    {
        let {mover, stayer} = await TestCrossServerClans.enterAndMove(context, 1, 1);
        let moved = await GameplayE2eStateApi.fetchPlayer(
            context.secondServerConfig,
            CrossServerHouseAssignment.SECOND_HOUSE,
            mover.playerName
        );
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            context.secondServerConfig,
            CrossServerHouseAssignment.SECOND_HOUSE,
            mover.playerName,
            moved.life - 1
        );
        expect(lowered.value, 'The life of the member on server-2 is lowered').toBe(moved.life - 1);
        await expect(
            stayer.page.locator(Selectors.clans.playerProperty(mover.playerId, TestCrossServerClans.LIFE_PROPERTY_KEY)),
            'The clan panel of the owner on server-1 shows the life changed on server-2'
        ).toHaveText(String(moved.life - 1), {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runMemberLeavesTest(context)
    {
        let {clanId, mover, stayer} = await TestCrossServerClans.enterAndMove(context, 1, 1);
        await TestCrossServerClans.leaveOnSecondServer(context, mover, clanId);
        await TestCrossServerClans.expectPanelLines(
            stayer.page,
            TestCrossServerClans.MEMBER_LINE,
            mover,
            0,
            'The owner on server-1 stops listing the member that left on server-2'
        );
    }

    static async runLoginAfterChangeTest(context)
    {
        let {clanId, players, mover} = await TestCrossServerClans.enterAndMove(context, 2, 1, 3);
        let [owner, , member] = players;
        await TestCrossServerClans.leaveOnSecondServer(context, mover, clanId);
        await member.page.reload();
        await Login.loginRootPlayer(member.page, context.gameConfig, context.longRun, '3');
        await TestCrossServerClans.expectPanelLines(
            member.page,
            TestCrossServerClans.MEMBER_LINE,
            owner,
            1,
            'The member logged in again on server-1 lists the owner'
        );
        await TestCrossServerClans.expectPanelLines(
            member.page,
            TestCrossServerClans.MEMBER_LINE,
            mover,
            0,
            'The member logged in again on server-1 does not list the member that left on server-2'
        );
    }

    static async runOwnerDisbandsTest(context)
    {
        let {clanId, mover, stayer} = await TestCrossServerClans.enterAndMove(context, 1, 0);
        await ClanSteps.leave(mover, clanId);
        await ClanSteps.expectOutOfClan(
            context.gameConfig,
            stayer,
            Login.TOWN_ROOM_NAME,
            TeamsConst.CHAT.MESSAGE.DISBANDED,
            mover.playerName
        );
    }

    static async runForgedInviteTest(context)
    {
        let {clanId, mover, stayer} = await TestCrossServerClans.enterAndMove(context, 0, 1);
        await ClanSteps.invite(stayer, mover);
        await stayer.page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        expect(
            (await ClanSteps.fetchClans(context.gameConfig))[clanId]?.pendingInvites || [],
            'Server-1 records no clan invite for a player that moved to server-2'
        ).not.toContain(mover.playerId);
    }

    static run()
    {
        test.describe('Cross Server Clans', () => {
            test('a clan member crossing into a server-2 room leaves the server-1 connected list and sees the owner online', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerClans.runMemberMovesTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a life change of a clan member on server-2 is shown in the clan panel of the owner on server-1', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerClans.runLifeChangeTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a clan member leaving the clan on server-2 loses the membership and the owner on server-1 stops listing it', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerClans.runMemberLeavesTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a clan member logging in on server-1 after a leave on server-2 gets the stored members', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerClans.runLoginAfterChangeTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a clan disbanded by its owner on server-2 sends the member on server-1 back to the create form', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerClans.runOwnerDisbandsTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a clan invite on server-1 for a player that moved to server-2 is rejected', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerClans.runForgedInviteTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerClans.run();
