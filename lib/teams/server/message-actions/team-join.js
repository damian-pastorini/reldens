/**
 *
 * Reldens - TeamJoin
 *
 */

const { Team } = require('../team');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { TeamLeave } = require('./team-leave');
const { Logger } = require('@reldens/utils');

class TeamJoin
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        if(playerSchema.player_id === data.id){
            Logger.info('The player is trying to join a team with himself.', playerSchema.player_id, data);
            return false;
        }
        if(playerSchema.currentTeam){
            await TeamLeave.execute(room, playerSchema, teamsPlugin);
        }
        let teamOwnerPlayer = room.playerByPlayerIdFromState(data.id);
        if(!teamOwnerPlayer){
            Logger.error('Player team owner not found.', teamOwnerPlayer, data);
            return false;
        }
        if(teamOwnerPlayer.currentTeam && teamOwnerPlayer.currentTeam !== data.id){
            Logger.info('Player was already in a team, leaving Team ID "'+teamOwnerPlayer.currentTeam+'"');
            await TeamLeave.execute(room, teamOwnerPlayer, teamsPlugin);
        }
        let teamOwnerClient = room.activePlayerById(data.id);
        if(!teamOwnerClient){
            Logger.error('Team join, player owner client not found.', teamOwnerClient, data);
            return false;
        }
        let teamProps = {
            owner: teamOwnerPlayer,
            ownerClient: teamOwnerClient.client,
            sharedProperties: room.config.get('client/ui/teams/sharedProperties')
        };
        let currentTeam = teamsPlugin.teams[teamOwnerPlayer.player_id];
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
        teamOwnerPlayer.currentTeam = teamOwnerPlayer.player_id;
        playerSchema.currentTeam = teamOwnerPlayer.player_id;
        teamsPlugin.teams[teamOwnerPlayer.player_id] = currentTeam;
        let eventBeforeJoinUpdate = {currentTeam, teamsPlugin, continueBeforeJoinUpdate: true};
        await teamsPlugin.events.emit('reldens.beforeTeamUpdatePlayers', eventBeforeJoinUpdate);
        if(!eventBeforeJoinUpdate.continueBeforeJoinUpdate){
            return false;
        }
        let updateSuccess = TeamUpdatesHandler.updateTeamPlayers(currentTeam);
        if(updateSuccess){
            await teamsPlugin.events.emit('reldens.afterPlayerJoinedTeam', {currentTeam, playerJoining: playerSchema});
        }
        return updateSuccess;
    }

}

module.exports.TeamJoin = TeamJoin;
