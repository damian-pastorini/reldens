/**
 *
 * Reldens - EndPlayerHitChangePointTeamHandler
 *
 * Handles team membership preservation when a player changes rooms.
 * Stores team information temporarily to allow rejoining after room transition.
 *
 */

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class EndPlayerHitChangePointTeamHandler
{

    /**
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
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
