/**
 *
 * Reldens - TryTeamStart
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class TryTeamStart
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        if(playerSchema.player_id === data.id){
            Logger.info('The player is trying to team up with himself.', playerSchema.player_id, data);
            return false;
        }
        let toPlayer = room.fetchActivePlayerById(data.id);
        if(false === toPlayer){
            Logger.error('Team invite player not found.', toPlayer, data);
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.TEAM_INVITE,
            listener: TeamsConst.KEY,
            from: playerSchema.playerName,
            id: playerSchema.player_id,
        };
        let event = {client, data, room, playerSchema, teamsPlugin, continueStart: true};
        await teamsPlugin.events.emit('reldens.tryTeamStart', event);
        if(!event.continueStart){
            return false;
        }
        toPlayer.client.send('*', sendData);
        return true;
    }
}

module.exports.TryTeamStart = TryTeamStart;
