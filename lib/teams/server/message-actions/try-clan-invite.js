/**
 *
 * Reldens - TryClanInvite
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class TryClanInvite
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        // @TODO - BETA - Replace send data by short constants so we will know like "data.id" here is the target ID.
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to clan up with himself.', playerSchema.sessionId, data);
            return false;
        }
        let clanId = playerSchema.getPrivate('clan');
        if(!clanId){
            Logger.error('Player without a clan is trying to send a clan invite.', playerSchema.sessionId, data);
            return false;
        }
        let clan = teamsPlugin.clans[clanId];
        if(!clan){
            Logger.critical(
                'Player has a clan ID but clan entity does not exists on TeamsPlugin.',
                playerSchema.sessionId,
                data,
                {availableClans: Object.keys(teamsPlugin.clans)}
            );
            return false;
        }
        let toPlayer = sc.get(room.activePlayers, data.id, false);
        if(false === toPlayer){
            Logger.error('Player not found.', toPlayer, data);
            return false;
        }
        if(clan.playerBySessionId(data.id)){
            Logger.info('Player already exists in clan.');
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.CLAN_INVITE,
            listener: TeamsConst.CLAN_KEY,
            from: playerSchema.playerName,
            id: clan.id,
            ownerId: playerSchema.sessionId
        };
        let event = {client, data, room, playerSchema, teamsPlugin, continueStart: true};
        await teamsPlugin.events.emit('reldens.tryClanStart', event);
        if(!event.continueStart){
            return false;
        }
        toPlayer.client.send('*', sendData);
        clan.pendingInvites[data.id] = true;
        return true;
    }
}

module.exports.TryClanInvite = TryClanInvite;
