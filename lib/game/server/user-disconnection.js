/**
 *
 * Reldens - UserDisconnection
 *
 * Disconnects a logged user from every room of this server and asks the other servers to disconnect it when it logs in
 * here, with the signed one-use messages of the disconnect route (the username is the message target). A server change
 * asks it as such, so the other servers keep the moving client session, and only checks the user presence when the
 * disconnection is off; a failed presence check (another server unreachable) counts as not logged there and never
 * refuses the join, while a failed disconnection (logged with its server) refuses it; every server is asked either way. A message of this same server instance (sent to another
 * host alias of this server, which is not one of its own addresses) is answered as not logged before its signature is
 * checked, since it is signed for that alias, and disconnects nothing. The rooms of the user end with its scene rooms first and stop at the first room that can not end it
 * (its player state not saved), so a refused disconnection keeps every other session of the user, its chat too.
 * A server change is taken as such only for a user that is changing the scene here or has no scene player here (before
 * its first scene); a user playing a scene here that is not changing it is logged out like on a new login of the account
 * (its client shows the session ended) and answered as not logged, so a join that only claims a scene change is a login.
 *
 */

const { SignedServerToServerMessenger } = require('./signed-server-to-server-messenger');
const { RoomGame } = require('../../rooms/server/game');
const { GameConst } = require('../constants');
const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('./signed-server-to-server-messenger').SignedServerToServerMessengerProps} MessengerProps
 *
 * @typedef {Object} UserDisconnectionProps
 * @property {RoomsManager} roomsManager
 * @property {ActivePlayers} activePlayers
 * @property {boolean} disconnectUsersOnServerChange
 * @property {string} serverInstanceId
 *
 * @typedef {Object} DisconnectionResult
 * @property {boolean} isSuccess
 * @property {boolean} wasLogged
 */
class UserDisconnection extends SignedServerToServerMessenger
{

    /**
     * @param {MessengerProps & UserDisconnectionProps} props
     */
    constructor(props)
    {
        super(props);
        /** @type {RoomsManager} */
        this.roomsManager = props.roomsManager;
        /** @type {ActivePlayers} */
        this.activePlayers = props.activePlayers;
        /** @type {boolean} */
        this.disconnectUsersOnServerChange = props.disconnectUsersOnServerChange;
        /** @type {string} */
        this.serverInstanceId = props.serverInstanceId;
    }

    /**
     * @param {string} username
     * @returns {boolean}
     */
    isSettledInScene(username)
    {
        for(let userRoom of this.fetchUserRooms(username, false)){
            if(userRoom.scenePlayer?.physicalBody && !userRoom.scenePlayer.physicalBody.isChangingScene){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {ExpressRequest} req
     * @returns {Promise<DisconnectionResult|{isSuccess: boolean}>}
     */
    async receiveRequest(req)
    {
        let senderInstanceId = sc.get(sc.parseJson(sc.get(req.body, 'payload', '')), 'senderInstanceId', '');
        if(Encryptor.constantTimeCompare(this.serverInstanceId, senderInstanceId)){
            return {isSuccess: true, wasLogged: false};
        }
        return await super.receiveRequest(req);
    }

    /**
     * @param {string} action
     * @param {string} username
     * @returns {Promise<DisconnectionResult>}
     */
    async receiveAction(action, username)
    {
        let activePlayer = this.activePlayers.fetchByUserNameInAnyRoom(username);
        let isSettledInScene = this.isSettledInScene(username);
        let wasLogged = false !== activePlayer && !isSettledInScene;
        if(GameConst.DISCONNECTION.CHECK_ONLY === action || !activePlayer){
            return {isSuccess: true, wasLogged};
        }
        if(!activePlayer.userModel){
            return {isSuccess: false, wasLogged: false};
        }
        let isDisconnected = await this.disconnectUserFromEveryRoom(
            activePlayer.userModel,
            false,
            GameConst.DISCONNECTION.SERVER_CHANGE === action && !isSettledInScene
        );
        return {isSuccess: isDisconnected, wasLogged: isDisconnected && wasLogged};
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
        let action = GameConst.DISCONNECTION.CHECK_ONLY;
        if(this.disconnectUsersOnServerChange){
            action = isServerChange ? GameConst.DISCONNECTION.SERVER_CHANGE : GameConst.DISCONNECTION.DISCONNECT;
        }
        await this.sendToServers(
            this.otherServersUrls,
            action,
            userModel.username,
            {senderInstanceId: this.serverInstanceId},
            (response, serverUrl) => {
                if(!response && this.disconnectUsersOnServerChange){
                    Logger.error('User disconnection not confirmed by server: '+serverUrl, userModel.username);
                    broadcastResult.isSuccess = false;
                }
                broadcastResult.wasLogged = broadcastResult.isSuccess
                    && (broadcastResult.wasLogged || true === sc.get(response, 'wasLogged', false));
            }
        );
        return broadcastResult;
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
        for(let userRoom of this.fetchUserRooms(userModel.username, avoidGameRoom)){
            let isRoomDisconnected = await userRoom.room.disconnectBySessionId(
                userRoom.activePlayer.sessionId,
                userRoom.activePlayer.client,
                userModel,
                isServerChange
            );
            if(false === isRoomDisconnected){
                Logger.error(
                    'User session not ended in room: '+userRoom.room.roomName+', its other sessions are kept.',
                    userModel.username
                );
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} username
     * @param {boolean} avoidGameRoom
     * @returns {Array<{room: Object, activePlayer: Object, scenePlayer: Object|boolean}>}
     */
    fetchUserRooms(username, avoidGameRoom)
    {
        let userRooms = [];
        for(let roomKey of Object.keys(this.roomsManager.createdInstances)){
            let room = this.roomsManager.createdInstances[roomKey];
            if(avoidGameRoom && room instanceof RoomGame){
                Logger.debug('Avoiding the single RoomGame instance disconnection.');
                continue;
            }
            let activePlayer = room.activePlayerByUserName(username, room.roomId, false);
            if(!activePlayer){
                Logger.debug(
                    'Active player not found by username "'+username+'" in room: '+room.roomName+' (ID: '+room.roomId+').'
                );
                continue;
            }
            if(!sc.isFunction(room.disconnectBySessionId)){
                Logger.warning(
                    'RoomScene ('+typeof room+') does not have a "disconnectBySessionId" method. '
                    +room.roomName+' (ID: '+room.roomId+').'
                );
                continue;
            }
            let scenePlayer = sc.isFunction(room.playerBySessionIdFromState)
                ? room.playerBySessionIdFromState(activePlayer.sessionId)
                : false;
            if(scenePlayer){
                userRooms.unshift({room, activePlayer, scenePlayer});
                continue;
            }
            userRooms.push({room, activePlayer, scenePlayer});
        }
        return userRooms;
    }

}

module.exports.UserDisconnection = UserDisconnection;
