/**
 *
 * Reldens - UserDisconnection
 *
 * Disconnects a logged user from every room of this server and asks the other servers to disconnect it when it logs in
 * here, with the signed one-use messages of the disconnect route (the username is the message target). A server change
 * asks it as such, so the other servers keep the moving client session, and only checks the user presence when the
 * disconnection is off; a failed presence check (another server unreachable) counts as not logged there and never
 * refuses the join, while a failed disconnection refuses it. A message of this same server instance is answered with no
 * disconnection.
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
     * @param {string} action
     * @param {string} username
     * @param {Object} payload
     * @returns {Promise<DisconnectionResult>}
     */
    async receiveAction(action, username, payload)
    {
        if(Encryptor.constantTimeCompare(this.serverInstanceId, sc.get(payload, 'senderInstanceId', ''))){
            return {isSuccess: true, wasLogged: false};
        }
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
        let serversResponses = await this.sendToServers(
            this.otherServersUrls,
            action,
            userModel.username,
            {senderInstanceId: this.serverInstanceId}
        );
        for(let serverResponse of serversResponses){
            if(!serverResponse.response && this.disconnectUsersOnServerChange){
                return {isSuccess: false, wasLogged: false};
            }
            broadcastResult.wasLogged = broadcastResult.wasLogged
                || true === sc.get(serverResponse.response, 'wasLogged', false);
        }
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
