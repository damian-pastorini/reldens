/**
 *
 * Reldens - UserDisconnection
 *
 * Disconnects a logged user from every room of this server and asks the other servers to disconnect it when it logs in
 * here, with signed one-use requests bound to the target server (any address of this server, its public or base URL)
 * and the username. A server change asks it as such, so
 * the other servers keep the moving client session, and only checks the user presence when the disconnection is off; a
 * failed presence check (another server unreachable) counts as not logged there and never refuses the join, while a
 * failed disconnection refuses it.
 * A server change is taken as such only for a user that is changing the scene here or has no scene player here (before
 * its first scene); a user playing a scene here that is not changing it is logged out like on a new login of the account
 * (its client shows the session ended) and answered as not logged, so a join that only claims a scene change is a login.
 *
 */

const { RoomGame } = require('../../rooms/server/game');
const { GameConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('./server-to-server-messenger-props').ServerToServerMessengerProps} ServerToServerMessengerProps
 *
 * @typedef {Object} UserDisconnectionProps
 * @property {ConfigManager} config
 * @property {RoomsManager} roomsManager
 * @property {typeof ActivePlayers} activePlayers
 * @property {ExpiringHmacToken} expiringHmacToken
 * @property {string} serverInstanceId
 * @property {ServerToServerMessengerProps} serverToServerMessengerProps
 *
 * @typedef {Object} DisconnectionResult
 * @property {boolean} isSuccess
 * @property {boolean} wasLogged
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
        /** @type {Array<string>} */
        this.serverSelfAddresses = props.serverToServerMessengerProps.serverSelfAddresses;
        /** @type {Array<string>} */
        this.otherServersUrls = props.serverToServerMessengerProps.otherServersUrls;
        /** @type {string} */
        this.serverInstanceId = props.serverInstanceId;
    }

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<boolean>}
     */
    async disconnectUserByLoginData(req)
    {
        let userData = req.body;
        if(!sc.isObject(userData) || !sc.isString(userData.username) || '' === userData.username){
            return false;
        }
        let now = Date.now();
        if(!this.isValidDisconnectionToken(userData, now)){
            Logger.warning('Invalid disconnection token.');
            return false;
        }
        if(!this.expiringHmacToken.markUsed(userData.token, now)){
            Logger.warning('Disconnection token already used.');
            return false;
        }
        let activePlayer = this.activePlayers.fetchByUserNameInAnyRoom(userData.username);
        if(userData.isCheckOnly || !activePlayer){
            return true;
        }
        if(!activePlayer.userModel){
            return false;
        }
        return await this.disconnectUserFromEveryRoom(
            activePlayer.userModel,
            false,
            userData.isServerChange && !this.isSettledInScene(userData.username)
        );
    }

    /**
     * @param {string} username
     * @returns {boolean}
     */
    isSettledInScene(username)
    {
        for(let roomKey of Object.keys(this.roomsManager.createdInstances)){
            let room = this.roomsManager.createdInstances[roomKey];
            if(!sc.isFunction(room.playerBySessionIdFromState)){
                continue;
            }
            let activePlayer = room.activePlayerByUserName(username, room.roomId, false);
            let playerSchema = activePlayer ? room.playerBySessionIdFromState(activePlayer.sessionId) : false;
            if(playerSchema?.physicalBody && !playerSchema.physicalBody.isChangingScene){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} requestData
     * @param {number} now
     * @returns {boolean}
     */
    isValidDisconnectionToken(requestData, now)
    {
        return this.serverSelfAddresses.some((serverSelfAddress) => this.expiringHmacToken.validate(
            this.disconnectionTokenValues(
                serverSelfAddress,
                sc.get(requestData, 'username', ''),
                sc.get(requestData, 'isServerChange', false),
                sc.get(requestData, 'isCheckOnly', false)
            ),
            sc.get(requestData, 'token', ''),
            now
        ));
    }

    /**
     * @param {ExpressRequest} req
     * @returns {boolean}
     */
    isUnusedSignedRequest(req)
    {
        let now = Date.now();
        return !this.expiringHmacToken.isUsed(sc.get(req.body, 'token', ''), now)
            && this.isValidDisconnectionToken(req.body, now);
    }

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<DisconnectionResult>}
     */
    async answerDisconnectRequest(req)
    {
        if(Encryptor.constantTimeCompare(this.serverInstanceId, sc.get(req.body, 'senderInstanceId', ''))){
            return {isSuccess: true, wasLogged: false};
        }
        let username = sc.get(req.body, 'username', '');
        let wasLogged = false !== this.activePlayers.fetchByUserNameInAnyRoom(username) && !this.isSettledInScene(username);
        if(!await this.disconnectUserByLoginData(req)){
            return {isSuccess: false, wasLogged: false};
        }
        return {isSuccess: true, wasLogged};
    }

    /**
     * @param {string} serverAddress
     * @param {string} username
     * @param {boolean} isServerChange
     * @param {boolean} isCheckOnly
     * @returns {Array<string>}
     */
    disconnectionTokenValues(serverAddress, username, isServerChange, isCheckOnly)
    {
        let tokenValues = [GameConst.ROUTE_PATHS.DISCONNECT_USER, serverAddress, username];
        if(isServerChange){
            tokenValues.push(GameConst.DISCONNECTION.SERVER_CHANGE);
        }
        if(isCheckOnly){
            tokenValues.push(GameConst.DISCONNECTION.CHECK_ONLY);
        }
        return tokenValues;
    }

    /**
     * @param {Object} userModel
     * @param {boolean} [isServerChange]
     * @returns {Promise<DisconnectionResult>}
     */
    async broadcastDisconnectionMessage(userModel, isServerChange = false)
    {
        let broadcastResult = {isSuccess: true, wasLogged: false};
        if(!this.disconnectUsersOnServerChange && !isServerChange){
            return broadcastResult;
        }
        let pendingResults = [];
        for(let serverUrl of this.otherServersUrls){
            pendingResults.push(this.disconnectFromServer(
                serverUrl,
                userModel.username,
                isServerChange,
                !this.disconnectUsersOnServerChange
            ));
        }
        for(let pendingResult of pendingResults){
            let disconnectionResult = await pendingResult;
            if(!disconnectionResult.isSuccess && this.disconnectUsersOnServerChange){
                return disconnectionResult;
            }
            broadcastResult.wasLogged = broadcastResult.wasLogged || disconnectionResult.wasLogged;
        }
        return broadcastResult;
    }

    /**
     * @param {string} serverUrl
     * @param {string} username
     * @param {boolean} isServerChange
     * @param {boolean} isCheckOnly
     * @returns {Promise<DisconnectionResult>}
     */
    async disconnectFromServer(serverUrl, username, isServerChange, isCheckOnly)
    {
        let disconnectionResult = {isSuccess: false, wasLogged: false};
        let token = this.expiringHmacToken.generate(
            this.disconnectionTokenValues(serverUrl, username, isServerChange, isCheckOnly),
            Date.now()+GameConst.SIGNED_TOKENS.DISCONNECT_EXPIRATION
        );
        if(!token){
            Logger.error('Disconnection token could not be generated, check the signed tokens secret.');
            return disconnectionResult;
        }
        let body = sc.toJsonString({
            username,
            token,
            isServerChange,
            isCheckOnly,
            senderInstanceId: this.serverInstanceId
        });
        try {
            let response = await fetch(serverUrl+GameConst.ROUTE_PATHS.DISCONNECT_USER, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)},
                body,
                signal: AbortSignal.timeout(GameConst.DISCONNECTION.REQUEST_TIMEOUT_MS)
            });
            if(!response.ok){
                Logger.error('Disconnect from server failed with status: '+response.status, serverUrl);
                return disconnectionResult;
            }
            let answer = await response.json();
            disconnectionResult.isSuccess = true === sc.get(answer, 'isSuccess', false);
            disconnectionResult.wasLogged = disconnectionResult.isSuccess
                && true === sc.get(answer, 'wasLogged', false);
        } catch (error) {
            Logger.error('Disconnect from server error, the login is refused.', serverUrl, error.message);
        }
        return disconnectionResult;
    }

    /**
     * @param {Object} userModel
     * @param {boolean} [avoidGameRoom=false]
     * @param {boolean} [isServerChange=false]
     * @returns {Promise<boolean>}
     */
    async disconnectUserFromEveryRoom(userModel, avoidGameRoom = false, isServerChange = false)
    {
        Logger.debug('Disconnect logged user: '+userModel.username);
        let isDisconnected = true;
        let createdRoomsKeys = Object.keys(this.roomsManager.createdInstances);
        for(let i of createdRoomsKeys){
            let roomScene = this.roomsManager.createdInstances[i];
            if(avoidGameRoom && roomScene instanceof RoomGame){
                Logger.debug('Avoiding the single RoomGame instance disconnection.');
                continue;
            }
            let activePlayer = roomScene.activePlayerByUserName(userModel.username, roomScene.roomId, false);
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
            let isRoomDisconnected = await roomScene.disconnectBySessionId(
                activePlayer.sessionId,
                activePlayer.client,
                userModel,
                isServerChange
            );
            if(false === isRoomDisconnected){
                Logger.error('User session not ended in room: '+roomScene.roomName+'.', userModel.username);
                isDisconnected = false;
            }
        }
        return isDisconnected;
    }

}

module.exports.UserDisconnection = UserDisconnection;
