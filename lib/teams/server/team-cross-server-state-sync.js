/**
 *
 * Reldens - TeamCrossServerStateSync
 *
 * Keeps a team in one state between the servers its members play on: a member moving to another server is sent there
 * ("arrive"), the members of every server are sent to the other team servers ("update") and a leave or disband too
 * ("leave"); a failed arrival drops the member from the team.
 *
 */

const { GroupCrossServerStateSync } = require('./group-cross-server-state-sync');
const { Team } = require('./team');
const { TeamUpdatesHandler } = require('./team-updates-handler');
const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('./group-cross-server-state-sync').GroupCrossServerStateSyncProps} GroupCrossServerStateSyncProps
 */
class TeamCrossServerStateSync extends GroupCrossServerStateSync
{

    /**
     * @param {GroupCrossServerStateSyncProps} props
     */
    constructor(props)
    {
        super(Object.assign({}, props, {
            groups: props.teamsPlugin.teams,
            isUpdateToAllServers: false,
            sendGroupPlayers: (team) => TeamUpdatesHandler.updateTeamPlayers(team),
            updateIntervalMs: TeamsConst.SYNC.UPDATE_INTERVAL_MS
        }));
        /** @type {Object<string, {playerSchema: PlayerState, client: Object}>} */
        this.localPlayers = {};
    }

    /**
     * @param {PlayerState} playerSchema
     * @returns {boolean}
     */
    removeLocalPlayer(playerSchema)
    {
        if(playerSchema !== this.localPlayers[playerSchema.player_id]?.playerSchema){
            return false;
        }
        delete this.localPlayers[playerSchema.player_id];
        return true;
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {string} serverUrl
     * @returns {Promise<boolean>}
     */
    async moveMemberToServer(playerSchema, serverUrl)
    {
        let team = sc.get(this.teamsPlugin.teams, playerSchema.currentTeam, false);
        if(!team){
            return false;
        }
        let playerData = PlayersDataMapper.fetchPlayerData(playerSchema, team.sharedProperties);
        team.leave(playerSchema);
        team.remotePlayers[playerData.player_id] = {serverUrl, data: playerData};
        let arrivalPayload = {
            arrivingPlayerId: playerData.player_id,
            players: Object.assign(this.mapLocalPlayers(team), team.remotePlayers)
        };
        if(!await this.sendRequest(serverUrl, TeamsConst.SYNC.ARRIVE, team.owner.player_id, arrivalPayload)){
            Logger.error('Team arrival not sent, the player "'+playerData.player_id+'" leaves the team.', serverUrl);
            await this.removeTeamPlayer(team, String(playerData.player_id));
            return await this.sendUpdate(team, team.owner.player_id);
        }
        if(0 === Object.keys(team.players).length){
            delete this.teamsPlugin.teams[team.owner.player_id];
        }
        return true;
    }

    /**
     * @param {Array<string>} serversUrls
     * @param {number|string} teamId
     * @param {number|string} playerId
     * @returns {Promise<boolean>}
     */
    async sendLeave(serversUrls, teamId, playerId)
    {
        let isSent = true;
        for(let serverResponse of await this.sendToServers(
            serversUrls,
            TeamsConst.SYNC.LEAVE,
            teamId,
            {playerId: String(playerId)}
        )){
            if(!serverResponse.response){
                Logger.warning('Team leave not answered.', {serverUrl: serverResponse.serverUrl, teamId, playerId});
                isSent = false;
            }
        }
        return isSent;
    }

    /**
     * @param {string} action
     * @param {string} teamId
     * @param {Object} payload
     * @returns {Promise<{isSuccess: boolean}>}
     */
    async receiveAction(action, teamId, payload)
    {
        if(TeamsConst.SYNC.UPDATE === action){
            return this.receiveUpdate(teamId, payload);
        }
        let isSuccess = false;
        if(TeamsConst.SYNC.ARRIVE === action){
            isSuccess = await this.receiveArrival(teamId, payload);
        }
        if(TeamsConst.SYNC.LEAVE === action){
            isSuccess = await this.receiveLeave(teamId, payload);
        }
        return {isSuccess};
    }

    /**
     * @param {string} teamId
     * @param {Object} payload
     * @returns {Promise<boolean>}
     */
    async receiveArrival(teamId, payload)
    {
        let arrivingPlayerId = String(sc.get(payload, 'arrivingPlayerId', ''));
        let players = sc.get(payload, 'players', false);
        if(!sc.isValidInteger(Number(arrivingPlayerId)) || 0 >= Number(arrivingPlayerId) || !sc.isObject(players)){
            return false;
        }
        let team = sc.get(this.teamsPlugin.teams, teamId, false) || await this.createRemoteTeam(teamId, players);
        if(!team){
            return false;
        }
        this.applyRemotePlayers(team, players);
        let localPlayer = sc.get(this.localPlayers, arrivingPlayerId, false);
        if(!localPlayer){
            this.teamsPlugin.teamChangingRoomPlayers[arrivingPlayerId] = {teamId: team.owner.player_id};
            return true;
        }
        if(localPlayer.playerSchema.currentTeam){
            Logger.info('Team arrival for a player already in a team.', arrivingPlayerId);
            return true;
        }
        team.join(localPlayer.playerSchema, localPlayer.client);
        localPlayer.playerSchema.currentTeam = team.owner.player_id;
        this.queueUpdate(team, team.owner.player_id);
        return TeamUpdatesHandler.updateTeamPlayers(team);
    }

    /**
     * @param {string} teamId
     * @param {Object} players
     * @returns {Promise<Team|boolean>}
     */
    async createRemoteTeam(teamId, players)
    {
        let ownerEntry = sc.get(players, teamId, {});
        let ownerData = PlayersDataMapper.mapReceivedPlayerData(
            teamId,
            sc.get(ownerEntry, 'data', false),
            this.sharedProperties
        );
        let ownerServerUrl = sc.get(ownerEntry, 'serverUrl', '');
        if(
            !ownerData
            || (this.serverSelfAddress !== ownerServerUrl && -1 === this.otherServersUrls.indexOf(ownerServerUrl))
        ){
            Logger.warning('Teams sync arrival without a valid team owner.', {teamId});
            return false;
        }
        let teamProps = {
            owner: {player_id: ownerData.player_id, playerName: ownerData.name},
            ownerClient: false,
            players: {},
            clients: {},
            remotePlayers: {[ownerData.player_id]: {serverUrl: ownerEntry.serverUrl, data: ownerData}},
            sharedProperties: this.sharedProperties,
            serversSync: this
        };
        let beforeCreateEvent = {teamProps, teamsPlugin: this.teamsPlugin, continueBeforeCreate: true};
        await this.teamsPlugin.events.emit('reldens.beforeTeamCreate', beforeCreateEvent);
        if(!beforeCreateEvent.continueBeforeCreate){
            return false;
        }
        let team = new Team(teamProps);
        this.teamsPlugin.teams[ownerData.player_id] = team;
        return team;
    }

    /**
     * @param {string} teamId
     * @param {Object} payload
     * @returns {Promise<boolean>}
     */
    async receiveLeave(teamId, payload)
    {
        let team = sc.get(this.teamsPlugin.teams, teamId, false);
        if(!team){
            return false;
        }
        return await this.removeTeamPlayer(team, String(sc.get(payload, 'playerId', '')));
    }

    /**
     * @param {Team} team
     * @param {string} playerId
     * @returns {Promise<boolean>}
     */
    async removeTeamPlayer(team, playerId)
    {
        if('' !== playerId){
            this.removeSinglePlayer(team, playerId);
        }
        let playersCount = Object.keys(Object.assign({}, team.players, team.remotePlayers)).length;
        if('' !== playerId && 1 < playersCount){
            return TeamUpdatesHandler.updateTeamPlayers(team);
        }
        for(let localPlayerId of Object.keys(team.players)){
            this.removeSinglePlayer(team, localPlayerId);
        }
        delete this.teamsPlugin.teams[team.owner.player_id];
        return true;
    }

    /**
     * @param {Team} team
     * @param {string} playerId
     * @returns {boolean}
     */
    removeSinglePlayer(team, playerId)
    {
        if(!sc.hasOwn(team.players, playerId)){
            delete team.remotePlayers[playerId];
            return true;
        }
        let client = team.clients[playerId];
        if(1 === client?.ref?.readyState){
            client.send('*', {act: TeamsConst.ACTIONS.TEAM_LEFT, id: team.owner.player_id, listener: TeamsConst.KEY});
        }
        return team.leave(team.players[playerId]);
    }

}

module.exports.TeamCrossServerStateSync = TeamCrossServerStateSync;
