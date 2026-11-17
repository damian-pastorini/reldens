/**
 *
 * Reldens - Clan Steps
 *
 * The steps of the clans specs: the clan rows of the group players preserved (the memberships of every player first and
 * then the clans they own, so the group restore deletes every membership a case creates before the clans they point
 * to), a clan created, an invite, an answer, a member joined by an invite and its accept, a leave
 * and a remove sent with the clan messages a client sends, the create answer a client received, the stored clans and
 * memberships, and the loaded clans of the server (TeamsProbe); and the group players entered with a clan level
 * modifier of the stat atk seeded, the clan created by the first player and the given members joined (each player with
 * its stored atk and its chat recorded again), the live atk of a player with or without that modifier, and a player
 * out of its clan (the create form, the modifier reverted and its only clan chat line).
 *
 */

const { expect } = require('@playwright/test');
const { TeamSteps } = require('./team-steps');
const { ChatSteps } = require('./chat-steps');
const { ClanSeed } = require('./clan-seed');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { TeamsConst } = require('../../../lib/teams/constants');
const { ChatConst } = require('../../../lib/chat/constants');

class ClanSteps
{

    static ACCEPT = '1';
    static DECLINE = '2';
    static CLAN_GROUP = 'clan';
    static STAT_KEY = 'atk';
    static INCREMENT_OPERATION = 1;
    static MODIFIER_VALUE = 10;

    static async enterWithClan(context, playersCount, membersCount)
    {
        let gameConfig = context.gameConfig;
        await ClanSeed.seedLevelModifier(
            gameConfig,
            context.e2eGroup,
            ClanSteps.STAT_KEY,
            ClanSteps.INCREMENT_OPERATION,
            ClanSteps.MODIFIER_VALUE
        );
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await ClanSteps.preserveClanRows(gameConfig, context.e2eGroup, players);
        let clanId = (await ClanSteps.createClan(players[0], 'E2eClan'+Date.now())).id;
        let membersIds = [players[0].playerId];
        for(let member of players.slice(1, membersCount + 1)){
            membersIds.push(member.playerId);
            await ClanSteps.join(gameConfig, players[0], member, clanId, membersIds);
        }
        for(let player of players){
            player.storedStat = await ClanSeed.fetchStoredStatValue(gameConfig, player.playerId, ClanSteps.STAT_KEY);
            await ChatSteps.recordChat(player.page);
        }
        return {players, clanId};
    }

    static async seedGroupClan(context, ownerIndex, membersIndexes, isOwnerIdClanId = false)
    {
        let gameConfig = context.gameConfig;
        let players = [];
        for(let suffix of TeamSteps.USER_SUFFIXES){
            let playerName = gameConfig['e2ePlayerName'+suffix];
            players.push({playerName, playerId: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})});
        }
        await ClanSteps.preserveClanRows(gameConfig, context.e2eGroup, players);
        return {
            clanId: await ClanSeed.seedClanWithMembers(
                gameConfig,
                context.e2eGroup,
                players[ownerIndex].playerId,
                membersIndexes.map(memberIndex => players[memberIndex].playerId),
                isOwnerIdClanId ? players[ownerIndex].playerId : false
            ),
            players
        };
    }

    static async expectStat(gameConfig, player, roomName, withModifier, message)
    {
        let expectedValue = player.storedStat + (withModifier ? ClanSteps.MODIFIER_VALUE : 0);
        await expect.poll(
            async () => ((await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, player.playerName)).stats || {})[
                ClanSteps.STAT_KEY
            ],
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedValue);
    }

    static async expectOutOfClan(gameConfig, player, roomName, chatLine, linePlayerName)
    {
        await expect(player.page.locator(Selectors.clans.nameInput), player.playerName+' gets the create form')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
        await ClanSteps.expectStat(gameConfig, player, roomName, false, 'The clan modifier is reverted on '+player.playerName);
        let expectedLine = chatLine.replace('%playerName', linePlayerName).replace('%groupName', ClanSteps.CLAN_GROUP);
        await expect.poll(async () => await ChatSteps.fetchTexts(player.page, ChatConst.TYPES.TEAMS), {
            message: player.playerName+' gets the clan line',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([expectedLine]);
    }

    static async preserveClanRows(gameConfig, group, players)
    {
        for(let player of players){
            await E2eSeedAndRestoreApi.preserveRows(gameConfig, group, 'clanMembers', {player_id: player.playerId});
        }
        for(let player of players){
            await E2eSeedAndRestoreApi.preserveRows(gameConfig, group, 'clan', {owner_id: player.playerId});
        }
    }

    static async create(player, clanName)
    {
        await RoomMessagesRecorder.start(player.page);
        await RoomMessagesRecorder.sendMessage(player.page, {
            act: TeamsConst.ACTIONS.CLAN_CREATE,
            [TeamsConst.ACTIONS.CLAN_NAME]: clanName
        });
        await RoomMessagesRecorder.waitForMessage(player.page, TeamsConst.ACTIONS.CLAN_CREATE, TimeConstants.SERVER_RESPONSE);
        return [...await RoomMessagesRecorder.fetchMessages(player.page, TeamsConst.ACTIONS.CLAN_CREATE)].pop();
    }

    static async createClan(player, clanName)
    {
        let created = await ClanSteps.create(player, clanName);
        expect(created.result, 'The clan '+clanName+' is created').toBe(TeamsConst.VALIDATION.SUCCESS);
        return created;
    }

    static async invite(ownerPlayer, invitedPlayer)
    {
        await RoomMessagesRecorder.sendMessage(ownerPlayer.page, {act: TeamsConst.ACTIONS.CLAN_INVITE, id: invitedPlayer.playerId});
    }

    static async answer(player, clanId, value)
    {
        await RoomMessagesRecorder.sendMessage(player.page, {act: TeamsConst.ACTIONS.CLAN_ACCEPTED, id: clanId, value});
    }

    static async join(gameConfig, ownerPlayer, memberPlayer, clanId, expectedIds)
    {
        await ClanSteps.invite(ownerPlayer, memberPlayer);
        await expect.poll(async () => (await ClanSteps.fetchClans(gameConfig))[clanId]?.pendingInvites || [], {
            message: 'The clan invite is pending',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toContain(memberPlayer.playerId);
        await ClanSteps.answer(memberPlayer, clanId, ClanSteps.ACCEPT);
        await ClanSteps.expectMembers(gameConfig, clanId, expectedIds, 'The member joined');
    }

    static async leave(player, clanId, removeId = false)
    {
        let message = {act: false === removeId ? TeamsConst.ACTIONS.CLAN_LEAVE : TeamsConst.ACTIONS.CLAN_REMOVE, id: clanId};
        if(false !== removeId){
            message.remove = removeId;
        }
        await RoomMessagesRecorder.sendMessage(player.page, message);
    }

    static async fetchClans(gameConfig)
    {
        return (await SecurityApi.request(gameConfig, 'GET', '/api/e2e/teams/state')).clans || {};
    }

    static async expectMembers(gameConfig, clanId, expectedIds, message)
    {
        await expect.poll(
            async () => (await ClanSteps.fetchClans(gameConfig))[clanId]?.membersIds || [],
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([...expectedIds].sort((idA, idB) => idA - idB));
    }

    static async expectMemberInNewRoom(gameConfig, owner, member, roomName)
    {
        await ClanSteps.expectStat(gameConfig, member, roomName, true, 'The modifier is applied once');
        await expect(member.page.locator(Selectors.clans.container), 'The member keeps the clan panel')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
        await expect(owner.page.locator('.clan-player-'+member.playerId), 'The owner still sees it connected')
            .toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async expectConnected(gameConfig, clanId, players, message)
    {
        await expect.poll(async () => (await ClanSteps.fetchClans(gameConfig))[clanId]?.connectedIds || [], {
            message,
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual(players.map(player => player.playerId).sort((idA, idB) => idA - idB));
    }

    static async fetchStoredClans(gameConfig, filters)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clan', filters);
    }

    static async fetchStoredMemberships(gameConfig, playerId)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'clanMembers', {player_id: playerId});
    }

}

module.exports.ClanSteps = ClanSteps;
