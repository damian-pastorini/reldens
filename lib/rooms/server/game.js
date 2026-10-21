/**
 *
 * Reldens - RoomGame
 *
 * Game lobby room that holds all logged users before joining scenes.
 *
 */

const { RoomLogin } = require('./login');
const { RoomsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('../../game/server/health/rooms-availability').RoomsAvailability} RoomsAvailability
 */
class RoomGame extends RoomLogin
{

    /**
     * @param {Object} props
     */
    onCreate(props)
    {
        super.onCreate(props);
        this.roomType = RoomsConst.ROOM_TYPE_GAME;
        /** @type {RoomsAvailability|boolean} */
        this.roomsAvailability = sc.get(props, 'roomsAvailability', false);
        Logger.notice('Created RoomGame: '+this.roomName+' ('+this.roomId+')');
        delete props.roomsManager.creatingInstances[this.roomName];
        this.loginManager.activePlayers.gameRoomInstanceId = this.roomId;
    }

    /**
     * @param {Client} client
     * @param {Object} options
     * @param {Object} userModel
     * @returns {Promise<void>}
     */
    async onJoin(client, options, userModel)
    {
        await this.events.emit('reldens.onJoinRoomGame', client, options, userModel, this);
        let isInitialLogin = !sc.hasOwn(options, 'selectedPlayer');
        let roomsAvailability = isInitialLogin
            ? await this.fetchPlayersRoomsAvailability(userModel.related_players)
            : {};
        if(this.isAutoStartPlayerRoomUnavailable(userModel.related_players, roomsAvailability)){
            Logger.notice('Login rejected, the room of the player is not available.', {username: userModel.username});
            ErrorManager.error(GameConst.PLAYER_ROOM_UNAVAILABLE_MESSAGE);
        }
        let loggedUser = this.activePlayerByUserName(userModel.username, this.roomId, false);
        if(loggedUser){
            //Logger.debug('Disconnecting already logged user: "'+userModel.username+'".');
            // check if the user is already logged and disconnect from all the previous rooms:
            await this.disconnectUserFromEveryOtherRoom(userModel);
        }
        if(!await this.loginManager.updateLastLogin(userModel)){
            //Logger.debug('Last login update error on user: "'+userModel.username+'".');
            client.send('*', {[GameConst.ACTION_KEY]: GameConst.LOGIN_UPDATE_ERROR});
            ErrorManager.error(GameConst.JOIN_GAME_ERROR_MESSAGE);
        }
        this.loginManager.activePlayers.add(userModel, client, this);
        // we need to send the engine and all the general and client configurations from the storage:
        let storedClientConfig = {client: this.config.client};
        let clientFullConfig = Object.assign({}, this.config.gameEngine, storedClientConfig);
        // @TODO - BETA - Reduce superInitialGameData by passing the data on the initial request.
        let superInitialGameData = {
            [GameConst.ACTION_KEY]: GameConst.START_GAME,
            sessionId: client.sessionId,
            players: userModel.related_players,
            // @NOTE: if multiplayer is disabled then we will use the first one as default:
            player: 0 < sc.length(userModel.related_players) ? userModel.related_players[0] : false,
            gameConfig: clientFullConfig,
            features: this.config.availableFeaturesList,
            userName: userModel.username,
            guestPassword: this.loginManager.isGuestUser(userModel) ? options.password : ''
        };
        await this.events.emit('reldens.beforeSuperInitialGameData', superInitialGameData, this, client, userModel);
        if(isInitialLogin){
            superInitialGameData.roomsAvailability = await this.appendSelectionRoomsAvailability(
                roomsAvailability,
                superInitialGameData.roomSelection
            );
        }
        client.send('*', superInitialGameData);
    }

    /**
     * @param {Array<Object>} relatedPlayers
     * @returns {Promise<Object<string, Object>>}
     */
    async fetchPlayersRoomsAvailability(relatedPlayers)
    {
        if(!this.roomsAvailability){
            return {};
        }
        if(!sc.isArray(relatedPlayers)){
            return {};
        }
        let roomsNames = [];
        for(let player of relatedPlayers){
            let sceneName = player?.state?.scene;
            if(sceneName && -1 === roomsNames.indexOf(sceneName)){
                roomsNames.push(sceneName);
            }
        }
        return await this.roomsAvailability.fetchRoomsAvailability(roomsNames);
    }

    /**
     * @param {Array<Object>} relatedPlayers
     * @param {Object<string, Object>} roomsAvailability
     * @returns {boolean}
     */
    isAutoStartPlayerRoomUnavailable(relatedPlayers, roomsAvailability)
    {
        if(!sc.isArray(relatedPlayers)){
            return false;
        }
        if(0 === relatedPlayers.length){
            return false;
        }
        if(this.config.getWithoutLogs('client/players/multiplePlayers/enabled', false)){
            return false;
        }
        if(this.config.getWithoutLogs('client/rooms/selection/allowOnLogin', false)){
            return false;
        }
        let playerRoomAvailability = sc.get(roomsAvailability, [...relatedPlayers].shift()?.state?.scene, false);
        if(!playerRoomAvailability){
            return false;
        }
        return !playerRoomAvailability.isAvailable;
    }

    /**
     * @param {Object<string, Object>} roomsAvailability
     * @param {Array<Object>} roomSelection
     * @returns {Promise<Object<string, Object>>}
     */
    async appendSelectionRoomsAvailability(roomsAvailability, roomSelection)
    {
        if(!this.roomsAvailability){
            return roomsAvailability;
        }
        if(!sc.isArray(roomSelection)){
            return roomsAvailability;
        }
        let roomsNames = [];
        for(let roomData of roomSelection){
            if(RoomsConst.ROOM_LAST_LOCATION_KEY === roomData.name || sc.hasOwn(roomsAvailability, roomData.name)){
                continue;
            }
            roomsNames.push(roomData.name);
        }
        return Object.assign(roomsAvailability, await this.roomsAvailability.fetchRoomsAvailability(roomsNames));
    }

    /**
     * @param {Client} client
     * @returns {Promise<void>}
     */
    async onLeave(client)
    {
        let activePlayer = this.activePlayerBySessionId(client.sessionId, this.roomId, false);
        if(!activePlayer){
            return;
        }
        this.loginManager.activePlayers.removeAllByUserId(activePlayer.userId);
    }

    /**
     * @param {Object} userModel
     * @returns {Promise<Object>}
     */
    async disconnectUserFromEveryOtherRoom(userModel)
    {
        return await this.loginManager.userDisconnection.disconnectUserFromEveryRoom(userModel, true);
    }

    /**
     * @param {Client} client
     * @param {Object} message
     * @returns {Promise<void>}
     */
    async handleReceivedMessage(client, message)
    {
        if(!sc.hasOwn(message, 'act') || message.act !== GameConst.CREATE_PLAYER){
            return;
        }
        if(!sc.isString(sc.get(message.formData, 'new-player-name', false))){
            Logger.warning('Invalid create player form data, session ID: '+client.sessionId);
            return;
        }
        message.formData.user_id = client.auth.id;
        let result = await this.loginManager.playerCreation.createNewPlayer(message.formData);
        result.act = GameConst.CREATE_PLAYER_RESULT;
        return client.send('*', result);
    }

}

module.exports.RoomGame = RoomGame;
