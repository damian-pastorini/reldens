/**
 *
 * Reldens - TryTeamStart
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class TryTeamStart
{
    static execute(client, data, room, playerSchema)
    {
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to team up with himself.', playerSchema.sessionId, data);
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
        toPlayer.client.send('*', sendData);
    }
}

module.exports.TryTeamStart = TryTeamStart;