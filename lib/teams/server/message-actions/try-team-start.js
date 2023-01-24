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
        let toPlayerClient = sc.get(room.activePlayers, data.id, false);
        if(false === toPlayerClient){
            Logger.error('Player client not found.', toPlayerClient, data);
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.TEAM_INVITE,
            listener: 'team',
            from: playerSchema.playerName,
            id: playerSchema.sessionId,
        };
        toPlayerClient.client.send('*', sendData);
    }
}

module.exports.TryTeamStart = TryTeamStart;