/**
 *
 * Reldens - CreatePlayerTeamHandler
 *
 * Handles rejoining players to their team when changing rooms or reconnecting.
 * Restores team membership and broadcasts updates to team members.
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class CreatePlayerTeamHandler
{

    /**
     * @param {Object} client
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async joinExistentTeam(client, playerSchema, teamsPlugin)
    {
        let teamId = teamsPlugin.teamChangingRoomPlayers[playerSchema.player_id]?.teamId;
        if(!teamId){
            //Logger.debug('Player "'+playerSchema.playerName+'" (ID "'+playerSchema.player_id+'"), is not in a team.');
            return false;
        }
        let currentTeam = teamsPlugin.teams[teamId];
        if(!currentTeam){
            Logger.error('Player "'+playerSchema.player_id+'" current team "'+teamId+'"not found.');
            playerSchema.currentTeam = false;
            return false;
        }
        currentTeam.join(playerSchema, client);
        playerSchema.currentTeam = teamId;
        TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

}

module.exports.CreatePlayerTeamHandler = CreatePlayerTeamHandler;
