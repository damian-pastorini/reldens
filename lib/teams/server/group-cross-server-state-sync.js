/**
 *
 * Reldens - GroupCrossServerStateSync
 *
 * Base of the teams and clans servers sync: maps the group members playing on this server for the other servers, and
 * keeps the members playing on the configured other servers as remote players of the group. An update ("update") sends
 * the members playing here to the group servers (every other server for the clans), each server answers with its own
 * members playing there, and the group is sent again to the clients of this server only when the answers changed the
 * remote members; a received update replaces the members of its sender and is sent to the clients of this server.
 *
 */

const { SignedServerToServerMessenger } = require('../../game/server/signed-server-to-server-messenger');
const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./plugin').TeamsPlugin} TeamsPlugin
 * @typedef {import('./shared-modifiers-group').SharedModifiersGroup} SharedModifiersGroup
 * @typedef {import('../../game/server/signed-server-to-server-messenger').SignedServerToServerMessengerProps
 * } SignedServerToServerMessengerProps
 *
 * @typedef {Object} GroupSyncProps
 * @property {TeamsPlugin} teamsPlugin
 * @property {Object} sharedProperties
 * @property {Object<string, SharedModifiersGroup>} groups
 * @property {boolean} isUpdateToAllServers
 * @property {function(SharedModifiersGroup): boolean} sendGroupPlayers
 *
 * @typedef {SignedServerToServerMessengerProps & GroupSyncProps} GroupCrossServerStateSyncProps
 */
class GroupCrossServerStateSync extends SignedServerToServerMessenger
{

    /**
     * @param {GroupCrossServerStateSyncProps} props
     */
    constructor(props)
    {
        super(props);
        /** @type {TeamsPlugin} */
        this.teamsPlugin = props.teamsPlugin;
        /** @type {Object} */
        this.sharedProperties = props.sharedProperties;
        /** @type {Object<string, SharedModifiersGroup>} */
        this.groups = props.groups;
        /** @type {boolean} */
        this.isUpdateToAllServers = props.isUpdateToAllServers;
        /** @type {function(SharedModifiersGroup): boolean} */
        this.sendGroupPlayers = props.sendGroupPlayers;
    }

    /**
     * @param {SharedModifiersGroup} group
     * @returns {Promise<boolean>}
     */
    async sendUpdate(group)
    {
        try {
            let sentRemotePlayers = sc.toJsonString(group.remotePlayers);
            let responses = await this.sendToServers(
                this.isUpdateToAllServers ? this.otherServersUrls : group.remoteServersUrls(),
                TeamsConst.SYNC.UPDATE,
                group.id,
                {serverUrl: this.serverSelfAddress, players: this.mapLocalPlayers(group)}
            );
            if(group !== sc.get(this.groups, group.id, false)){
                return true;
            }
            for(let serverResponse of responses){
                if(serverResponse.response){
                    this.replaceServerPlayers(group, serverResponse.serverUrl, serverResponse.response.players);
                }
            }
            if(sentRemotePlayers === sc.toJsonString(group.remotePlayers)){
                return true;
            }
            return this.sendGroupPlayers(group);
        } catch (error) {
            Logger.error('Group update to the other servers error.', error.message);
            return false;
        }
    }

    /**
     * @param {string} groupId
     * @param {Object} payload
     * @returns {{isSuccess: boolean, players: Object}}
     */
    receiveUpdate(groupId, payload)
    {
        let group = sc.get(this.groups, groupId, false);
        if(!group){
            return {isSuccess: true, players: {}};
        }
        this.replaceServerPlayers(group, sc.get(payload, 'serverUrl', ''), sc.get(payload, 'players', false));
        this.sendGroupPlayers(group);
        return {isSuccess: true, players: this.mapLocalPlayers(group)};
    }

    /**
     * @param {SharedModifiersGroup} group
     * @returns {Object<string, {serverUrl: string, data: Object}>}
     */
    mapLocalPlayers(group)
    {
        let players = {};
        for(let playerId of Object.keys(group.players)){
            players[playerId] = {
                serverUrl: this.serverSelfAddress,
                data: PlayersDataMapper.fetchPlayerData(group.players[playerId], group.sharedProperties)
            };
        }
        return players;
    }

    /**
     * @param {SharedModifiersGroup} group
     * @param {string} senderUrl
     * @param {Object} players
     * @returns {boolean}
     */
    replaceServerPlayers(group, senderUrl, players)
    {
        if(-1 === this.otherServersUrls.indexOf(senderUrl) || !sc.isObject(players)){
            return false;
        }
        for(let playerId of Object.keys(group.remotePlayers)){
            if(senderUrl === group.remotePlayers[playerId].serverUrl && !sc.hasOwn(players, playerId)){
                delete group.remotePlayers[playerId];
            }
        }
        this.applyRemotePlayers(group, players);
        return true;
    }

    /**
     * @param {SharedModifiersGroup} group
     * @param {Object} players
     * @returns {boolean}
     */
    applyRemotePlayers(group, players)
    {
        for(let playerId of Object.keys(players)){
            let entry = players[playerId];
            if(!this.isRemoteEntry(group, playerId, entry)){
                continue;
            }
            let playerData = PlayersDataMapper.mapReceivedPlayerData(playerId, entry.data, group.sharedProperties);
            if(playerData){
                group.remotePlayers[playerData.player_id] = {serverUrl: entry.serverUrl, data: playerData};
            }
        }
        return true;
    }

    /**
     * @param {SharedModifiersGroup} group
     * @param {string} playerId
     * @param {Object} entry
     * @returns {boolean}
     */
    isRemoteEntry(group, playerId, entry)
    {
        return 0 < Number(playerId)
            && sc.isValidInteger(Number(playerId))
            && !sc.hasOwn(group.players, playerId)
            && sc.isObject(entry)
            && -1 !== this.otherServersUrls.indexOf(entry.serverUrl);
    }

}

module.exports.GroupCrossServerStateSync = GroupCrossServerStateSync;
