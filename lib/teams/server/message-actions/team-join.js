/**
 *
 * Reldens - TeamsMessageActions
 *
 */

const { Team } = require('../team');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger } = require('@reldens/utils');

class TeamJoin
{

    static execute(client, data, room, playerSchema, teamsPlugin)
    {
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to join a team with himself.', playerSchema.sessionId, data);
            return false;
        }
        if(playerSchema.currentTeam){
            teamsPlugin.teams[playerSchema.player_id]?.leave(playerSchema);
        }
        let teamOwnerPlayer = room.playerByIdFromState(data.id);
        if(!teamOwnerPlayer){
            Logger.error('Player team owner not found.', teamOwnerPlayer, data);
            return false;
        }
        let teamOwnerClient = room.activePlayers[data.id];
        if(!teamOwnerClient){
            Logger.error('Player team owner client not found.', teamOwnerClient, data);
            return false;
        }
        let currentTeam = teamsPlugin.teams[teamOwnerClient.id] || new Team({
            owner: teamOwnerPlayer,
            ownerClient: teamOwnerClient.client,
            sharedProperties: room.config.get('client/ui/teams/sharedProperties')
        });
        currentTeam.join(playerSchema, client);
        teamOwnerPlayer.currentTeam = teamOwnerClient.id;
        playerSchema.currentTeam = teamOwnerClient.id;
        teamsPlugin.teams[teamOwnerClient.id] = currentTeam;
        TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

}

module.exports.TeamJoin = TeamJoin;
