/**
 *
 * Reldens - Clan Steps
 *
 * The steps of the clans specs: the clan rows of the group players preserved (the memberships of every player first and
 * then the clans they own, so the group restore deletes every membership a case creates before the clans they point
 * to), a clan created, an invite, an answer, a leave
 * and a remove sent with the clan messages a client sends, the create answer a client received, the stored clans and
 * memberships, and the loaded clans of the server (TeamsProbe).
 *
 */

const { expect } = require('@playwright/test');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { SecurityApi } = require('./security-api');
const { TimeConstants } = require('./time-constants');
const { TeamsConst } = require('../../../lib/teams/constants');

class ClanSteps
{

    static ACCEPT = '1';
    static DECLINE = '2';

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
