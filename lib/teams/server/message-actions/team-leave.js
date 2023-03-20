/**
 *
 * Reldens - TeamLeave
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class TeamLeave
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        await teamsPlugin.events.emit('reldens.teamLeave', {client, data, room, playerSchema, teamsPlugin});
        let teamId = playerSchema.currentTeam;
        if(!teamId){
            return false;
        }
        let currentTeam = teamsPlugin.teams[teamId];
        if(!currentTeam){
            Logger.error('Player "'+playerSchema.player_id+'"current team "'+teamId+'"not found.');
            playerSchema.currentTeam = false;
            return false;
        }
        let playerIds = Object.keys(currentTeam.players);
        let removeByKeys = playerSchema.id === teamId || 2 >= playerIds.length ? playerIds : [playerSchema.id];
        for(let playerId of removeByKeys){
            let sendUpdate = {
                act: TeamsConst.ACTIONS.TEAM_LEFT,
                id: currentTeam.ownerClient.id,
                listener: TeamsConst.KEY
            };
            await teamsPlugin.events.emit('reldens.teamLeaveBeforeSendUpdate', {
                playerId,
                sendUpdate,
                client,
                data,
                room,
                playerSchema,
                teamsPlugin
            });
            currentTeam.clients[playerId].send('*', sendUpdate);
            currentTeam.leave(currentTeam.players[playerId]);
        }
        if(0 === Object.keys(currentTeam.players).length){
            let event = {client, data, room, playerSchema, teamsPlugin, continueDisband: true};
            await teamsPlugin.events.emit('reldens.beforeTeamDisband', event);
            if(!event.continueDisband){
                return false;
            }
            delete teamsPlugin.teams[teamId];
            return true;
        }
        let event = {client, data, room, playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.beforeTeamDisband', event);
        if(!event.continueLeave){
            return false;
        }
        TeamUpdatesHandler.updateTeamPlayers(currentTeam);
        return true;
    }

}

module.exports.TeamLeave = TeamLeave;
