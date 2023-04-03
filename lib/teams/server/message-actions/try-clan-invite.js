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
        let toPlayer = sc.get(room.activePlayers, data.id, false);
        if(false === toPlayer){
            Logger.error('Player not found.', toPlayer, data);
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.TEAM_INVITE,
            listener: TeamsConst.KEY,
            from: playerSchema.playerName,
            id: playerSchema.sessionId,
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
