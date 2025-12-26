/**
 *
 * Reldens - RoomLogin
 *
 * Base authenticated room that handles login, authentication, and user validation.
 *
 */

const { Room } = require('@colyseus/core');
const { RoomsConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('../../game/server/login-manager').LoginManager} LoginManager
 * @typedef {import('../../features/server/manager').FeaturesManager} FeaturesManager
 */
class RoomLogin extends Room
{

    /**
     * @param {Object} options
     */
    onCreate(options)
    {
        if(options.roomsManager.creatingInstances[this.roomName]){
            ErrorManager.error(RoomsConst.ERRORS.CREATING_ROOM_AWAIT);
        }
        if(!this.isValidRoomOnServer(options)){
            ErrorManager.error('Invalid server room: '+this.roomName+' ('+this.roomId+').');
        }
        options.roomsManager.creatingInstances[this.roomName] = true;
        /** @type {string} */
        this.roomType = RoomsConst.ROOM_TYPE_LOGIN;
        /** @type {EventsManager|boolean} */
        this.events = sc.get(options, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomLogin.');
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(options, 'dataServer', false);
        /** @type {ConfigManager} */
        this.config = options.config;
        /** @type {LoginManager} */
        this.loginManager = options.loginManager;
        /** @type {FeaturesManager} */
        this.featuresManager = options.featuresManager;
        /** @type {boolean} */
        this.validateRoomData = false;
        /** @type {string} */
        this.guestEmailDomain = this.config.getWithoutLogs('server/players/guestsUser/emailDomain');
        /** @type {boolean} */
        this.validateRoomsOriginRequest = this.config.getWithoutLogs('server/rooms/validateRoomsOriginRequest', false);
        this.events.emitSync('reldens.roomLoginOnCreate', {roomLogin: this, options});
        this.onMessage('*', this.handleReceivedMessage.bind(this));
        options.roomsManager.createdInstances[this.roomId] = this;
        options.roomsManager.instanceIdByName[this.roomName] = this.roomId;
    }

    /**
     * @param {Client} client
     * @param {Object} options
     * @param {Object} request
     * @returns {Promise<Object>}
     */
    async onAuth(client, options, request)
    {
        if(!options){
            Logger.warning('Auth missing options.');
            ErrorManager.error('Could not connect to the game.');
        }
        if(!this.isValidOriginRequest(request)){
            Logger.warning('Auth invalid origin request.');
            ErrorManager.error('Could not connect to the game.');
        }
        let activeUser = this.activePlayerByUserName(options.username, this.roomId);
        if(activeUser?.userModel){
            return await this.disconnectFromOtherServers(activeUser?.userModel, options);
        }
        let loginResult = await this.loginManager.processUserRequest(options);
        if(sc.hasOwn(loginResult, 'error')){
            // @TODO - BETA - Improve login errors, use send message with type and here just return false.
            ErrorManager.error(loginResult.error);
        }
        if(sc.hasOwn(options, 'selectedPlayer')){
            loginResult.selectedPlayer = options.selectedPlayer;
            loginResult.user.player = this.getPlayerByIdFromArray(loginResult.user.related_players, options.selectedPlayer);
        }
        let result = {confirm: true};
        await this.events.emitSync('reldens.roomLoginOnAuth', {
            roomLogin: this,
            result,
            loginResult,
            client,
            options,
            request
        });
        if(!result.confirm){
            Logger.warning('Connection denied on event result.');
            ErrorManager.error('Could not connect to the game.');
        }
        return await this.disconnectFromOtherServers(loginResult.user, options);
    }

    /**
     * @param {Object} options
     * @returns {boolean}
     */
    isValidRoomOnServer(options)
    {
        this.validateRoomOnServer = options?.config?.getWithoutLogs('server/rooms/validateRoomOnServer', true);
        if(!this.validateRoomOnServer){
            return true;
        }
        let currentServerBaseUrl = options?.config?.getWithoutLogs('server/baseUrl', '');
        if(!currentServerBaseUrl){
            return true;
        }
        let roomServerUrl = options?.roomData?.serverUrl;
        if(!roomServerUrl){
            return true;
        }
        return roomServerUrl === currentServerBaseUrl;
    }

    /**
     * @param {Object} request
     * @returns {boolean}
     */
    isValidOriginRequest(request)
    {
        if(!this.validateRoomsOriginRequest){
            return true;
        }
        let roomServerUrl = this.roomData?.serverUrl;
        if(!roomServerUrl){
            return true;
        }
        return roomServerUrl === request.headers.origin || roomServerUrl === request.headers.host;
    }

    /**
     * @param {Object} userModel
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async disconnectFromOtherServers(userModel, options)
    {
        let disconnectResult = await this.loginManager.broadcastDisconnectionMessage(userModel, options);
        if(!disconnectResult){
            Logger.warning('Disconnection error on activeUser.', options, disconnectResult);
            ErrorManager.error('Could not connect to the game.');
        }
        return userModel;
    }

    /**
     * @param {string} userName
     * @param {string} roomId
     * @param {boolean} [withPlayer]
     * @returns {Object|boolean}
     */
    activePlayerByUserName(userName, roomId, withPlayer = true)
    {
        return this.loginManager.activePlayers.fetchByRoomAndUserName(userName, roomId, withPlayer);
    }

    /**
     * @param {string} sessionId
     * @param {string} roomId
     * @param {boolean} [withPlayer]
     * @returns {Object|boolean}
     */
    activePlayerBySessionId(sessionId, roomId, withPlayer = true)
    {
        return this.loginManager.activePlayers.fetchByRoomAndSessionId(sessionId, roomId, withPlayer);
    }

    /**
     * @param {number} playerId
     * @param {string} roomId
     * @param {boolean} [withPlayer]
     * @returns {Object|boolean}
     */
    activePlayerByPlayerId(playerId, roomId, withPlayer = true)
    {
        return this.loginManager.activePlayers.fetchByRoomAndPlayerId(playerId, roomId, withPlayer);
    }

    /**
     * @param {string} playerName
     * @param {string} roomId
     * @param {boolean} [withPlayer]
     * @returns {Object|boolean}
     */
    activePlayerByPlayerName(playerName, roomId, withPlayer = true)
    {
        return this.loginManager.activePlayers.fetchByRoomAndPlayerName(playerName, roomId, withPlayer);
    }

    /**
     * @param {Player} playerSchema
     * @param {Client} client
     * @param {boolean} isChangingScene
     */
    removeActivePlayer(playerSchema, client, isChangingScene)
    {
        if(playerSchema.sessionId !== client.sessionId){
            Logger.error(
                'Player session ID and client session ID are different.',
                playerSchema.sessionId,
                client.sessionId
            );
        }
        if(!isChangingScene){
            this.loginManager.activePlayers.removeAllByUserId(playerSchema.userId);
        }
        this.loginManager.activePlayers.removeByRoomAndSessionId(playerSchema.sessionId, this.roomId);
    }

    /**
     * @param {Client} client
     * @param {Object} message
     * @returns {Promise<void>}
     */
    async handleReceivedMessage(client, message)
    {
        Logger.debug('Missing messages handler function.', message);
    }

    /**
     * @param {Array<Object>} players
     * @param {number} playerId
     * @returns {Object|boolean}
     */
    getPlayerByIdFromArray(players, playerId)
    {
        if(!sc.isArray(players) || 0 === players.length){
            return false;
        }
        for(let player of players){
            if(player.id === playerId){
                return player;
            }
        }
        return false;
    }

    /**
     * @param {string} playerRoomName
     * @param {boolean} isGuest
     * @param {boolean} isChangePointHit
     * @returns {boolean}
     */
    validateRoom(playerRoomName, isGuest, isChangePointHit = false)
    {
        if(
            this.config.server.rooms.validation.enabled
            && !this.config.client.rooms.selection.allowOnRegistration
            && !this.config.client.rooms.selection.allowOnLogin
            && !isChangePointHit
        ){
            this.validRooms = this.config.server.rooms.validation.valid.split(',');
            if(-1 === this.validRooms.indexOf(this.roomName) && playerRoomName !== this.roomName){
                Logger.error('Invalid player room: '+playerRoomName +'. Current room: '+this.roomName);
                return false;
            }
        }
        if(isGuest){
            for(let i of Object.keys(this.loginManager.roomsManager.availableRoomsGuest)){
                let room = this.loginManager.roomsManager.availableRoomsGuest[i];
                if(room?.roomName === playerRoomName){
                    return true;
                }
            }
            Logger.error(
                'Invalid room for guest: '+playerRoomName +'. Current room: '+this.roomName,
                Object.keys(this.loginManager.roomsManager.availableRoomsGuest)
            );
            return false;
        }
        return true;
    }

    /**
     * @returns {Promise<Object>}
     */
    onDispose()
    {
        return new Promise((resolve, reject) => {
            let result = {confirm: true};
            let event = {roomName: this.roomName, roomId: this.roomId, result};
            try {
                this.events.emitSync('reldens.onRoomDispose', event);
                Logger.info('Disposed RoomLogin "'+this.roomName+'" (ID: '+this.roomId+').');
            } catch (error) {
                result.confirm = false;
                event.error = error;
            }
            if(result.confirm){
                return resolve(event);
            }
            return reject(event);
        });
    }

}

module.exports.RoomLogin = RoomLogin;
