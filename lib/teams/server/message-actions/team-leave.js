/**
 *
 * Reldens - TeamLeave
 *
 * Handles player leaving or being removed from a team.
 * Manages team disbanding when conditions are met and broadcasts updates to remaining members. A leave with no remove
 * ID (a disconnect, or a member accepting the invite of another team) removes the leaving member itself, only the
 * owner leaving with no remove ID disbands the team. The members playing on other servers count as team members, are
 * removed as remote players, and the leave or the disband is sent to their servers.
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 * @typedef {import('../team').Team} Team
 */
class TeamLeave
{

    /**
     * @param {Object} data
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async fromMessage(data, room, playerSchema, teamsPlugin)
    {
        await teamsPlugin.events.emit('reldens.teamLeave', {data, room, playerSchema, teamsPlugin});
        let singleRemoveId = sc.get(data, 'remove', false);
        let isTeamOwner = playerSchema.player_id === playerSchema.currentTeam;
        if(TeamsConst.ACTIONS.TEAM_REMOVE === data.act){
            if(!isTeamOwner){
                Logger.error('Team remove failed, player "'+playerSchema.playerName+'" not allowed.');
                return false;
            }
            if(!singleRemoveId){
                Logger.error('Team remove failed, missing single remove ID.', data);
                return false;
            }
            let removingTeam = teamsPlugin.teams[playerSchema.currentTeam];
            if(
                !sc.hasOwn(removingTeam?.players, singleRemoveId)
                && !sc.hasOwn(removingTeam?.remotePlayers, singleRemoveId)
            ){
                Logger.error('Team remove failed, player "'+singleRemoveId+'" is not a team member.');
                return false;
            }
        }
        if(TeamsConst.ACTIONS.TEAM_LEAVE === data.act){
            singleRemoveId = isTeamOwner ? false : playerSchema.player_id;
        }
        return await this.execute(room, playerSchema, teamsPlugin, singleRemoveId);
    }

    /**
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @param {number|string|boolean} singleRemoveId
     * @returns {Promise<boolean>}
     */
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
        let playerIds = Object.keys(Object.assign({}, currentTeam.players, currentTeam.remotePlayers));
        let remoteServersUrls = currentTeam.remoteServersUrls();
        let removeId = singleRemoveId || (playerSchema.player_id === teamId ? false : playerSchema.player_id);
        let isOwnerDisbanding = playerSchema.player_id === teamId && !removeId;
        let areLessPlayerThanRequired = 2 >= playerIds.length;
        let removeByKeys = isOwnerDisbanding || areLessPlayerThanRequired ? playerIds : [removeId];
        for(let playerId of removeByKeys){
            if(!sc.hasOwn(currentTeam.players, playerId)){
                delete currentTeam.remotePlayers[playerId];
                continue;
            }
            if(1 === currentTeam.clients[playerId]?.ref?.readyState){
                let sendUpdate = {
                    act: TeamsConst.ACTIONS.TEAM_LEFT,
                    id: currentTeam.owner.player_id,
                    listener: TeamsConst.KEY
                };
                await teamsPlugin.events.emit('reldens.teamLeaveBeforeSendUpdate', {
                    playerId,
                    sendUpdate,
                    currentTeam,
                    isOwnerDisbanding,
                    areLessPlayerThanRequired,
                    singleRemoveId: removeId,
                    room,
                    playerSchema,
                    teamsPlugin
                });
                currentTeam.clients[playerId].send('*', sendUpdate);
            }
            let leavingPlayerName = currentTeam.players[playerId].playerName;
            currentTeam.leave(currentTeam.players[playerId]);
            await teamsPlugin.events.emit('reldens.afterTeamLeave', {currentTeam, leavingPlayerName});
        }
        if(1 >= Object.keys(Object.assign({}, currentTeam.players, currentTeam.remotePlayers)).length){
            let event = {singleRemoveId: removeId, room, playerSchema, teamsPlugin, continueDisband: true};
            await teamsPlugin.events.emit('reldens.beforeTeamDisband', event);
            if(!event.continueDisband){
                return false;
            }
            delete teamsPlugin.teams[teamId];
            return await currentTeam.serversSync.sendLeave(remoteServersUrls, teamId, '');
        }
        let event = {singleRemoveId: removeId, room, playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.beforeTeamDisband', event);
        if(!event.continueLeave){
            return false;
        }
        await currentTeam.serversSync.sendLeave(remoteServersUrls, teamId, removeId);
        return TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

}

module.exports.TeamLeave = TeamLeave;
