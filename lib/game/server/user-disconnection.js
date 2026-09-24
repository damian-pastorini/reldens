/**
 *
 * Reldens - UserDisconnection
 *
 * Disconnects a logged user from every room of this server, asks the other servers of a multi-server setup to
 * disconnect the user when it logs in here, and validates the signed disconnection requests received from them.
 *
 */

const { RoomGame } = require('../../rooms/server/game');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Request} ExpressRequest
 *
 * @typedef {Object} UserDisconnectionProps
 * @property {ConfigManager} config
 * @property {RoomsManager} roomsManager
 * @property {typeof ActivePlayers} activePlayers
 * @property {ExpiringHmacToken} expiringHmacToken
 */
class UserDisconnection
{

    /**
     * @param {UserDisconnectionProps} props
     */
    constructor(props)
    {
        /** @type {RoomsManager} */
        this.roomsManager = props.roomsManager;
        /** @type {typeof ActivePlayers} */
        this.activePlayers = props.activePlayers;
        /** @type {ExpiringHmacToken} */
        this.expiringHmacToken = props.expiringHmacToken;
        /** @type {boolean} */
        this.disconnectUsersOnServerChange = props.config.getWithoutLogs(
            'server/players/disconnectUsersOnServerChange',
            true
        );
        /** @type {string} */
        this.serverSelfUrl = props.config.getWithoutLogs('server/publicUrl', '');
        /** @type {Object<string, Array<string>>} */
        this.roomsPerServer = this.mapRoomsServers(props.config.getWithoutLogs('client/rooms/servers', {}));
    }

    /**
     * @param {Object<string, string>} roomsServersConfig
     * @returns {Object<string, Array<string>>}
     */
    mapRoomsServers(roomsServersConfig)
    {
        let roomsServers = {};
        for(let roomName of Object.keys(roomsServersConfig)){
            if(!roomsServers[roomsServersConfig[roomName]]){
                roomsServers[roomsServersConfig[roomName]] = [];
            }
            roomsServers[roomsServersConfig[roomName]].push(roomName);
        }
        return roomsServers;
    }

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<boolean>}
     */
    async disconnectUserByLoginData(req)
    {
        let userData = req.body;
        if(!userData || !userData?.username){
            return false;
        }
        if(!this.expiringHmacToken.validate([userData.username], userData.token, Date.now())){
            Logger.warning('Invalid disconnection token for user: '+userData.username);
            return false;
        }
        let activePlayer = this.activePlayers.fetchByRoomAndUserName(
            userData.username,
            this.activePlayers.gameRoomInstanceId
        );
        if(!activePlayer){
            return true;
        }
        if(!activePlayer.userModel){
            return false;
        }
        return await this.disconnectUserFromEveryRoom(activePlayer.userModel);
    }

    /**
     * @param {Object} userModel
     * @returns {Promise<boolean>}
     */
    async broadcastDisconnectionMessage(userModel)
    {
        if(!this.disconnectUsersOnServerChange){
            return true;
        }
        let roomServersList = Object.keys(this.roomsPerServer);
        if(0 === roomServersList.length){
            return true;
        }
        for(let serverUrl of roomServersList){
            if(this.serverSelfUrl === serverUrl){
                continue;
            }
            let disconnectionResult = await this.disconnectFromServer(serverUrl, userModel.username);
            if(!disconnectionResult){
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} serverUrl
     * @param {string} username
     * @returns {Promise<boolean>}
     */
    async disconnectFromServer(serverUrl, username)
    {
        let token = this.expiringHmacToken.generate(
            [username],
            Date.now()+GameConst.SIGNED_TOKENS.DISCONNECT_EXPIRATION
        );
        if(!token){
            Logger.error('Disconnection token could not be generated, check the signed tokens secret.');
            return false;
        }
        let disconnectUrl = serverUrl+GameConst.ROUTE_PATHS.DISCONNECT_USER;
        let body = sc.toJsonString({username, token});
        try {
            let response = await fetch(
                disconnectUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body)
                    },
                    body,
                }
            );
            if(!response?.ok){
                Logger.error('Disconnect from server failed with status: '+response?.status, serverUrl);
                return false;
            }
            return (await response.json()).isSuccess;
        } catch (error) {
            Logger.error('Disconnect from server error, the login continues.', serverUrl, error.message);
            return true;
        }
    }

    /**
     * @param {Object} userModel
     * @param {boolean} [avoidGameRoom=false]
     * @returns {Promise<boolean>}
     */
    async disconnectUserFromEveryRoom(userModel, avoidGameRoom = false)
    {
        Logger.debug('Disconnect logged user: '+userModel.username);
        let createdRoomsKeys = Object.keys(this.roomsManager.createdInstances);
        for(let i of createdRoomsKeys){
            let roomScene = this.roomsManager.createdInstances[i];
            if(avoidGameRoom && roomScene instanceof RoomGame){
                Logger.debug('Avoiding the single RoomGame instance disconnection.');
                continue;
            }
            let activePlayer = roomScene.activePlayerByUserName(userModel.username, roomScene.roomId);
            if(!activePlayer){
                Logger.debug(
                    'Active player not found by username "'+userModel.username+'" in room: '
                    +roomScene.roomName+' (ID: '+roomScene.roomId+').'
                );
                continue;
            }
            if(!sc.isFunction(roomScene.disconnectBySessionId)){
                Logger.warning(
                    'RoomScene ('+typeof roomScene+') does not have a "disconnectBySessionId" method. '
                    +roomScene.roomName+' (ID: '+roomScene.roomId+').'
                );
                continue;
            }
            await roomScene.disconnectBySessionId(activePlayer.sessionId, activePlayer.client, userModel);
        }
        return true;
    }

}

module.exports.UserDisconnection = UserDisconnection;
