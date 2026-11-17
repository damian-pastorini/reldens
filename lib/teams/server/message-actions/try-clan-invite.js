/**
 *
 * Reldens - TryClanInvite
 *
 * Handles clan invitation requests from clan members.
 * Validates the invitation, checks clan membership, and sends clan invite message to the target player. The own player
 * id is refused as a string or a number, with the open invites off (client/clan/general/openInvites, read once by the
 * teams plugin) only the clan owner can invite, and a player already in the clan members is not invited again.
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class TryClanInvite
{

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        // @TODO - BETA - Replace send data by short constants so we will know like "data.id" here is the target ID.
        if(String(playerSchema.player_id) === String(data.id)){
            Logger.info('The player is trying to clan up with himself.', playerSchema.player_id, data);
            return false;
        }
        let clanId = playerSchema.getPrivate('clan');
        if(!clanId){
            Logger.error('Player without a clan is trying to send a clan invite.', playerSchema.player_id, data);
            return false;
        }
        let clan = teamsPlugin.clans[clanId];
        if(!clan){
            Logger.critical(
                'Player has a clan ID but clan entity does not exists on TeamsPlugin.',
                playerSchema.sessionId,
                playerSchema.player_id,
                data,
                {availableClans: Object.keys(teamsPlugin.clans)}
            );
            return false;
        }
        if(!teamsPlugin.clanOpenInvites && String(clan.owner.player_id) !== String(playerSchema.player_id)){
            Logger.info('Only the clan owner can invite while the open invites are off.', playerSchema.player_id, data);
            return false;
        }
        let toPlayerClient = room.activePlayerByPlayerId(data.id, room.roomId)?.client;
        if(!toPlayerClient){
            Logger.error('Clan invite player not found.', toPlayerClient, data);
            return false;
        }
        if(sc.hasOwn(clan.members, data.id)){
            Logger.info('Player already exists in clan.');
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.CLAN_INVITE,
            listener: TeamsConst.CLAN_KEY,
            from: playerSchema.playerName,
            id: clan.id,
            ownerId: playerSchema.player_id
        };
        let event = {client, data, room, playerSchema, teamsPlugin, continueStart: true};
        await teamsPlugin.events.emit('reldens.tryClanStart', event);
        if(!event.continueStart){
            return false;
        }
        toPlayerClient.send('*', sendData);
        clan.addInvite(data.id, playerSchema.player_id);
        return true;
    }
}

module.exports.TryClanInvite = TryClanInvite;
