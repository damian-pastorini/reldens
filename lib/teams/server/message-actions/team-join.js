/**
 *
 * Reldens - TeamJoin
 *
 */

const { Team } = require('../team');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger } = require('@reldens/utils');

class TeamJoin
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
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
        let teamProps = {
            owner: teamOwnerPlayer,
            ownerClient: teamOwnerClient.client,
            sharedProperties: room.config.get('client/ui/teams/sharedProperties')
        };
        let currentTeam = teamsPlugin.teams[teamOwnerClient.id];
        if(!currentTeam){
            let beforeCreateEvent = {teamProps, teamsPlugin, continueBeforeCreate: true};
            await teamsPlugin.events.emit('reldens.beforeTeamCreate', beforeCreateEvent);
            if(!beforeCreateEvent.continueBeforeCreate){
                return false;
            }
            currentTeam = new Team(teamProps);
        }
        let eventBeforeJoin = {currentTeam, teamsPlugin, continueBeforeJoin: true};
        await teamsPlugin.events.emit('reldens.beforeTeamJoin', eventBeforeJoin);
        if(!eventBeforeJoin.continueBeforeJoin){
            return false;
        }
        currentTeam.join(playerSchema, client);
        teamOwnerPlayer.currentTeam = teamOwnerClient.id;
        playerSchema.currentTeam = teamOwnerClient.id;
        teamsPlugin.teams[teamOwnerClient.id] = currentTeam;
        let eventBeforeJoinUpdate = {currentTeam, teamsPlugin, continueBeforeJoinUpdate: true};
        await teamsPlugin.events.emit('reldens.beforeTeamUpdatePlayers', eventBeforeJoinUpdate);
        if(!eventBeforeJoinUpdate.continueBeforeJoinUpdate){
            return false;
        }
        TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

}

module.exports.TeamJoin = TeamJoin;
