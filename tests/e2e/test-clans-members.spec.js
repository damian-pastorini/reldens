/**
 *
 * Reldens - Test Clans Members
 *
 * Tests the clan members leaving and removed (TeamSteps players in their scene, a clan level modifier of the stat atk
 * seeded for the group, the clan rows of the players preserved and the clan created by the first player with the given
 * members joined by an invite and its accept): the owner sees the disband label and a member the leave label, and the
 * owner disband deletes the clan, returns every online member to the create form with the modifier reverted and the
 * disbanded line naming the owner; a member leaving removes only its membership, returns it to the create form with the
 * modifier reverted and the left line, and the remaining panels drop it; the remove buttons show only on the owner panel
 * and never on the owner, the owner removes an offline member and an online one (create form, modifier reverted and the
 * removed line) and the remove of a player that is not a member is skipped; a remove by a member, a remove with a wrong
 * clan id and a leave by a player with no clan change nothing, and a leave with the remove of another member removes
 * only the sender; the owner remove of its own id disbands the clan; the left line is stored with the teams chat type;
 * a member declining the invite of another clan keeps the panel of its own clan; and with open invites on, the rejected
 * and accepted lines of an invite sent by a member reach that member and not the owner.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ClanSteps } = require('./helpers/clan-steps');
const { TeamSteps } = require('./helpers/team-steps');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { TeamsConst } = require('../../lib/teams/constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClansMembers
{

    static SETTLE_MS = 1500;

    static async enter(context, membersCount)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 7, context.longRun));
        return await ClanSteps.enterWithClan(context, 3, membersCount);
    }

    static async expectStoredClan(gameConfig, clanId, expectedCount, message)
    {
        await expect.poll(
            async () => (await ClanSteps.fetchStoredClans(gameConfig, {id: clanId})).length,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedCount);
    }

    static async expectNoMembership(gameConfig, player, message)
    {
        await expect.poll(
            async () => (await ClanSteps.fetchStoredMemberships(gameConfig, player.playerId)).length,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
    }

    static async runOwnerDisbandTest(context)
    {
        let entered = await TestClansMembers.enter(context, 2);
        let players = entered.players;
        for(let player of players){
            await ClanSteps.expectStat(context.gameConfig, player, Login.TOWN_ROOM_NAME, true, 'Applied to '+player.playerName);
        }
        await expect(players[0].page.locator(Selectors.clans.disbandAction), 'The owner sees the disband label')
            .toHaveText(TeamsConst.LABELS.CLAN.DISBAND);
        await expect(players[1].page.locator(Selectors.clans.disbandAction), 'The member sees the leave label')
            .toHaveText(TeamsConst.LABELS.CLAN.LEAVE);
        await ClanSteps.leave(players[0], entered.clanId);
        await TestClansMembers.expectStoredClan(context.gameConfig, entered.clanId, 0, 'The disband deletes the clan');
        for(let member of players.slice(1)){
            await ClanSteps.expectOutOfClan(
                context.gameConfig,
                member,
                Login.TOWN_ROOM_NAME,
                TeamsConst.CHAT.MESSAGE.DISBANDED,
                players[0].playerName
            );
        }
    }

    static async runMemberLeaveTest(context)
    {
        let entered = await TestClansMembers.enter(context, 2);
        let players = entered.players;
        let gameConfig = context.gameConfig;
        await ClanSteps.leave(players[1], entered.clanId);
        await ClanSteps.expectMembers(gameConfig, entered.clanId, [players[0].playerId, players[2].playerId], 'Left');
        await TestClansMembers.expectNoMembership(gameConfig, players[1], 'The membership is deleted');
        for(let remaining of [players[0], players[2]]){
            expect(
                (await ClanSteps.fetchStoredMemberships(gameConfig, remaining.playerId)).map(row => Number(row.clan_id)),
                'The membership of '+remaining.playerName+' is kept'
            ).toEqual([Number(entered.clanId)]);
            await expect(remaining.page.locator('.clan-member-'+players[1].playerId), 'The remaining panel drops it')
                .toHaveCount(0, {timeout: TimeConstants.SERVER_RESPONSE});
        }
        await ClanSteps.expectOutOfClan(
            gameConfig,
            players[1],
            Login.TOWN_ROOM_NAME,
            TeamsConst.CHAT.MESSAGE.LEAVE,
            players[1].playerName
        );
        let leftLine = TeamsConst.CHAT.MESSAGE.LEAVE.replace('%playerName', players[1].playerName)
            .replace('%groupName', ClanSteps.CLAN_GROUP);
        await expect.poll(async () => (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'chat', {
            player_id: players[1].playerId,
            message_type: ChatConst.TYPES.TEAMS
        })).map(row => row.message), {message: 'The left line is stored with the teams type', timeout: TimeConstants.SERVER_RESPONSE})
            .toContain(leftLine);
    }

    static async runDeclineInClanTest(context)
    {
        let entered = await TestClansMembers.enter(context, 1);
        let [owner, member, otherOwner] = entered.players;
        let otherClan = await ClanSteps.createClan(otherOwner, 'E2eOther'+Date.now());
        await ClanSteps.invite(otherOwner, member);
        await member.page.locator('[id^="opt-decline-'+TeamsConst.CLAN_KEY+'"]').first().click({timeout: TimeConstants.SERVER_RESPONSE});
        await expect.poll(async () => (await ClanSteps.fetchClans(context.gameConfig))[otherClan.id]?.pendingInvites || [], {
            message: 'The other clan invite is declined',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([]);
        await expect(member.page.locator('.clan-container.clan-'+entered.clanId), 'The member keeps its own clan panel')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
        await expect(member.page.locator('#box-'+TeamsConst.CLAN_KEY+' .box-title'), 'With its own clan title')
            .toContainText(owner.playerName);
    }

    static async runMemberInviteLinesTest(context)
    {
        let gameConfig = context.gameConfig;
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, context.e2eGroup, 'client/clan/general/openInvites', true);
        let entered = await TestClansMembers.enter(context, 1);
        let [owner, member, invited] = entered.players;
        await ClanSteps.invite(member, invited);
        await expect.poll(async () => (await ClanSteps.fetchClans(gameConfig))[entered.clanId]?.pendingInvites || [], {
            message: 'The member invite is pending',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toContain(invited.playerId);
        await ClanSteps.answer(invited, entered.clanId, ClanSteps.DECLINE);
        let rejectedLine = TeamsConst.CHAT.MESSAGE.INVITE_REJECTED.replace('%playerName', invited.playerName);
        await expect.poll(async () => await ChatSteps.fetchTexts(member.page, ChatConst.TYPES.TEAMS), {
            message: 'The inviting member gets the rejected line',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toContain(rejectedLine);
        await ClanSteps.join(gameConfig, member, invited, entered.clanId, TeamSteps.sortedIds(entered.players));
        let acceptedLine = TeamsConst.CHAT.MESSAGE.INVITE_ACCEPTED.replace('%playerName', invited.playerName);
        await expect.poll(async () => await ChatSteps.fetchTexts(member.page, ChatConst.TYPES.TEAMS), {
            message: 'The inviting member gets the accepted line',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toContain(acceptedLine);
        let ownerLines = await ChatSteps.fetchTexts(owner.page, ChatConst.TYPES.TEAMS);
        expect(ownerLines, 'The owner gets no rejected line').not.toContain(rejectedLine);
        expect(ownerLines, 'The owner gets no accepted line').not.toContain(acceptedLine);
    }

    static async runOwnerRemovesTest(context)
    {
        let entered = await TestClansMembers.enter(context, 2);
        let players = entered.players;
        let gameConfig = context.gameConfig;
        await players[0].page.click(Selectors.hud.clanOpen);
        for(let player of players){
            await expect(
                players[0].page.locator('.clan-member-'+player.playerId+' .clan-remove-button'),
                'The owner remove button of '+player.playerName
            ).toHaveCount(player === players[0] ? 0 : 1);
            await expect(players[1].page.locator('.clan-member-'+player.playerId+' .clan-remove-button'), 'No member button')
                .toHaveCount(0);
        }
        await players[2].page.close();
        await ClanSteps.expectConnected(gameConfig, entered.clanId, players.slice(0, 2), 'The third player is offline');
        await ClanSteps.leave(players[0], entered.clanId, String(Math.max(...players.map(player => player.playerId)) + 1000));
        await ClanSteps.leave(players[0], entered.clanId, String(players[2].playerId));
        await ClanSteps.expectMembers(gameConfig, entered.clanId, [players[0].playerId, players[1].playerId], 'Offline');
        await TestClansMembers.expectNoMembership(gameConfig, players[2], 'The offline membership is deleted');
        await players[0].page.locator('.clan-remove-player-'+players[1].playerId).click();
        await ClanSteps.expectMembers(gameConfig, entered.clanId, [players[0].playerId], 'The online member is removed');
        await ClanSteps.expectOutOfClan(
            gameConfig,
            players[1],
            Login.TOWN_ROOM_NAME,
            TeamsConst.CHAT.MESSAGE.REMOVED,
            players[1].playerName
        );
    }

    static async runRejectedRemovesTest(context)
    {
        let entered = await TestClansMembers.enter(context, 1);
        let players = entered.players;
        let clanId = entered.clanId;
        let leaveAct = TeamsConst.ACTIONS.CLAN_LEAVE;
        await ClanSteps.leave(players[1], clanId, String(players[0].playerId));
        await ClanSteps.leave(players[0], Number(clanId) + 1000, String(players[1].playerId));
        await RoomMessagesRecorder.sendMessage(players[2].page, {act: leaveAct, id: clanId});
        await players[0].page.waitForTimeout(TestClansMembers.SETTLE_MS);
        let membersIds = [players[0].playerId, players[1].playerId];
        await ClanSteps.expectMembers(context.gameConfig, clanId, membersIds, 'Nothing changes');
        for(let member of players.slice(0, 2)){
            expect((await ClanSteps.fetchStoredMemberships(context.gameConfig, member.playerId)).length, 'Kept').toBe(1);
        }
        await RoomMessagesRecorder.sendMessage(players[1].page, {act: leaveAct, id: clanId, remove: String(players[0].playerId)});
        await ClanSteps.expectMembers(context.gameConfig, clanId, [players[0].playerId], 'Only the sender leaves');
        await TestClansMembers.expectStoredClan(context.gameConfig, clanId, 1, 'The clan is kept');
    }

    static async runOwnerRemovesItselfTest(context)
    {
        let entered = await TestClansMembers.enter(context, 1);
        let players = entered.players;
        await ClanSteps.leave(players[0], entered.clanId, players[0].playerId);
        await TestClansMembers.expectStoredClan(context.gameConfig, entered.clanId, 0, 'The owner remove of itself disbands');
        await ClanSteps.expectOutOfClan(
            context.gameConfig,
            players[1],
            Login.TOWN_ROOM_NAME,
            TeamsConst.CHAT.MESSAGE.DISBANDED,
            players[0].playerName
        );
    }

    static run()
    {
        test.describe('Clans Members', () => {
            test('owner disband returns the online members to the create form with the disbanded line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runOwnerDisbandTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member leaving removes only its membership and gets the left line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runMemberLeaveTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner removes an offline and an online member with the owner remove buttons', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runOwnerRemovesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('removes by a member or with a wrong clan and leaves with no clan or another remove change nothing else', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runRejectedRemovesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner remove of its own id disbands the clan', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runOwnerRemovesItselfTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member declining another clan invite keeps its own clan panel', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runDeclineInClanTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('rejected and accepted lines of a member invite reach the inviting member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClansMembers.runMemberInviteLinesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClansMembers.run();
