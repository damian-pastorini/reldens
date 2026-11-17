/**
 *
 * Reldens - CreatePlayerTeamHandler
 *
 * Handles rejoining players to their team when changing rooms or reconnecting.
 * Restores team membership and broadcasts updates to team members. The changing room record of the player is consumed
 * on its next player creation, so a player that left the team after the scene change is never added to it again, and
 * a player whose team was deleted while it changed the scene gets the left message, so its client closes the team box.
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { TeamsConst } = require('../../constants');
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
        delete teamsPlugin.teamChangingRoomPlayers[playerSchema.player_id];
        if(!teamId){
            //Logger.debug('Player "'+playerSchema.playerName+'" (ID "'+playerSchema.player_id+'"), is not in a team.');
            return false;
        }
        let currentTeam = teamsPlugin.teams[teamId];
        if(!currentTeam){
            Logger.error('Player "'+playerSchema.player_id+'" current team "'+teamId+'"not found.');
            playerSchema.currentTeam = false;
            client.send('*', {act: TeamsConst.ACTIONS.TEAM_LEFT, id: teamId, listener: TeamsConst.KEY});
            return false;
        }
        currentTeam.join(playerSchema, client);
        playerSchema.currentTeam = teamId;
        TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

}

module.exports.CreatePlayerTeamHandler = CreatePlayerTeamHandler;
