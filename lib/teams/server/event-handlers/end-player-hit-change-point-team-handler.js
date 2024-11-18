/**
 *
 * Reldens - EndPlayerHitChangePointTeamHandler
 *
 */

const { Logger } = require('@reldens/utils');

class EndPlayerHitChangePointTeamHandler
{

    static async savePlayerTeam(playerSchema, teamsPlugin)
    {
        let teamId = playerSchema.currentTeam;
        if(!teamId){
            //Logger.debug('Player "'+playerSchema?.playerName+'" ('+playerSchema?.player_id+'), team not saved.');
            return false;
        }
        teamsPlugin.teamChangingRoomPlayers[playerSchema.player_id] = {
            teamId,
            leavingPlayerSessionId: playerSchema.sessionId
        };
        teamsPlugin.teams[teamId].leave(playerSchema);
    }

}

module.exports.EndPlayerHitChangePointTeamHandler = EndPlayerHitChangePointTeamHandler;
