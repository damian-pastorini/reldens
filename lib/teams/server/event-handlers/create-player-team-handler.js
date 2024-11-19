/**
 *
 * Reldens - CreatePlayerTeamHandler
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger } = require('@reldens/utils');

class CreatePlayerTeamHandler
{

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
