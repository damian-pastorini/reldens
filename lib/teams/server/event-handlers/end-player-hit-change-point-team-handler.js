/**
 *
 * Reldens - EndPlayerHitChangePointTeamHandler
 *
 */

class EndPlayerHitChangePointTeamHandler
{

    static async savePlayerTeam(playerSchema, teamsPlugin)
    {
        let teamId = playerSchema.currentTeam;
        if(!teamId){
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
