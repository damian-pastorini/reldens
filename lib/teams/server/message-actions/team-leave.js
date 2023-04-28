/**
 *
 * Reldens - TeamLeave
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class TeamLeave
{

    static async fromMessage(data, room, playerSchema, teamsPlugin)
    {
        await teamsPlugin.events.emit('reldens.teamLeave', {data, room, playerSchema, teamsPlugin});
        if(TeamsConst.ACTIONS.TEAM_REMOVE === data.act && data.id !== playerSchema.player_id){
            Logger.error('Team remove failed, player "'+playerSchema.playerName+'" not allowed.');
            return false;
        }
        return await this.execute(room, playerSchema, teamsPlugin, sc.get(data, 'remove', playerSchema.player_id));
    }

    static async execute(room, playerSchema, teamsPlugin, singleRemoveId)
    {
        let teamId = playerSchema.currentTeam;
        if(!teamId){
            return false;
        }
        let currentTeam = teamsPlugin.teams[teamId];
        if(!currentTeam){
            Logger.error('Player "'+playerSchema.player_id+'" current team "'+teamId+'" not found.');
            playerSchema.currentTeam = false;
            return false;
        }
        // @NOTE: the way this works is by making the clients leave the team and then updating the remaining players.
        let playerIds = Object.keys(currentTeam.players);
        let removeByKeys = playerSchema.player_id === teamId || 2 >= playerIds.length ? playerIds : [singleRemoveId];
        for(let playerId of removeByKeys){
            if(1 === currentTeam.clients[playerId]?.ref?.readyState){
                let sendUpdate = {
                    act: TeamsConst.ACTIONS.TEAM_LEFT,
                    id: currentTeam.ownerClient.id,
                    listener: TeamsConst.KEY
                };
                await teamsPlugin.events.emit('reldens.teamLeaveBeforeSendUpdate', {
                    playerId,
                    sendUpdate,
                    singleRemoveId,
                    room,
                    playerSchema,
                    teamsPlugin
                });
                currentTeam.clients[playerId].send('*', sendUpdate);
            }
            currentTeam.leave(currentTeam.players[playerId]);
        }
        if(1 >= Object.keys(currentTeam.players).length){
            let event = {singleRemoveId, room, playerSchema, teamsPlugin, continueDisband: true};
            await teamsPlugin.events.emit('reldens.beforeTeamDisband', event);
            if(!event.continueDisband){
                return false;
            }
            delete teamsPlugin.teams[teamId];
            return true;
        }
        let event = {singleRemoveId, room, playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.beforeTeamDisband', event);
        if(!event.continueLeave){
            return false;
        }
        return TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

}

module.exports.TeamLeave = TeamLeave;
