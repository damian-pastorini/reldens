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
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to clan up with himself.', playerSchema.sessionId, data);
            return false;
        }
        let playerClan = playerSchema.getPrivate('clan');
        if(!playerClan){
            Logger.warning('Player without a clan is trying to send a clan invite.', playerSchema.sessionId, data);
            return false;
        }
        let toPlayer = sc.get(room.activePlayers, data.id, false);
        if(false === toPlayer){
            Logger.error('Player not found.', toPlayer, data);
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.CLAN_INVITE,
            listener: TeamsConst.CLAN_KEY,
            from: playerSchema.playerName,
            id: playerClan.id,
            ownerId: playerSchema.sessionId
        };
        let event = {client, data, room, playerSchema, teamsPlugin, continueStart: true};
        await teamsPlugin.events.emit('reldens.tryClanStart', event);
        if(!event.continueStart){
            return false;
        }
        toPlayer.client.send('*', sendData);
        return true;
    }
}

module.exports.TryClanInvite = TryClanInvite;
