/**
 *
 * Reldens - TeamsMessageActions
 *
 */

const { Team } = require('../team');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger, sc } = require('@reldens/utils');

class TeamJoin
{

    static execute(client, data, room, playerSchema)
    {
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to join a team with himself.', playerSchema.sessionId, data);
            return false;
        }
        if(playerSchema.currentTeam){
            playerSchema.currentTeam.leave();
        }
        let teamOwnerPlayer = sc.get(room.activePlayers, data.id, false);
        if(false === teamOwnerPlayer){
            Logger.error('Player team owner not found.', teamOwnerPlayer, data);
            return false;
        }
        playerSchema.currentTeam = teamOwnerPlayer.currentTeam || new Team({
            owner: teamOwnerPlayer,
            sharedProperties: room.config.get('client/ui/teams/sharedProperties')
        });
        TeamUpdatesHandler.updateTeamPlayers(playerSchema.currentTeam);
    }

}

module.exports.TeamJoin = TeamJoin;
