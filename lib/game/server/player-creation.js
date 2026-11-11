/**
 *
 * Reldens - PlayerCreation
 *
 * Creates the new players of a user: cleans the player name to the characters the usernames allow (letters, numbers,
 * "_", "." and "-", so spaces, accents and HTML never reach a stored name), cuts it to its maximum length (the players
 * name column size by default) and validates its minimum length, prepares the initial state from the configured
 * initial state or the selected registration room, and stores the player with its state. The name check and the store
 * run one at a time per name (case-insensitive, like the name column), so two players created with the same name at the
 * same time on this server never both get it, and with servers that have their own database the name is also held and
 * checked on every one of them before it is stored (CrossServerNamesCheck). The players table only keeps the name
 * unique per user, since the guests can share their names (allowDuplicateGuestNames).
 *
 */

const { KeyedOperationsLock } = require('./memory/keyed-operations-lock');
const { UsersConst } = require('../../users/constants');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} PlayerCreationProps
 * @property {ConfigManager} config
 * @property {UsersManager} usersManager
 * @property {RoomsManager} roomsManager
 * @property {EventsManager} events
 * @property {PlayerRoomState} playerRoomState
 * @property {CrossServerNamesCheck} crossServerNamesCheck
 * @property {number} minimumPlayerNameLength
 * @property {number} maximumPlayerNameLength
 * @property {Object} roomsSelection
 */
class PlayerCreation
{

    /**
     * @param {PlayerCreationProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {UsersManager} */
        this.usersManager = props.usersManager;
        /** @type {RoomsManager} */
        this.roomsManager = props.roomsManager;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {PlayerRoomState} */
        this.playerRoomState = props.playerRoomState;
        /** @type {CrossServerNamesCheck} */
        this.crossServerNamesCheck = props.crossServerNamesCheck;
        /** @type {number} */
        this.minimumPlayerNameLength = props.minimumPlayerNameLength;
        /** @type {number} */
        this.maximumPlayerNameLength = props.maximumPlayerNameLength;
        /** @type {Object} */
        this.roomsSelection = props.roomsSelection;
        /** @type {KeyedOperationsLock} */
        this.playerNamesLock = new KeyedOperationsLock();
    }

    /**
     * @param {Object<string, any>} loginData
     * @returns {Promise<Object<string, any>>}
     */
    async createNewPlayer(loginData)
    {
        // @TODO - BETA - Replace all result.message hardcoded values by snippets.
        loginData['new-player-name'] = loginData['new-player-name'].toString()
            .replace(UsersConst.PLAYER_NAME_INVALID_CHARACTERS, '')
            .slice(0, this.maximumPlayerNameLength);
        if(this.minimumPlayerNameLength > loginData['new-player-name'].length){
            let result = {error: true, message: 'Invalid player name, please choose another name.'};
            await this.events.emit('reldens.playerNewName', this, loginData, result);
            return result;
        }
        let initialState = await this.prepareInitialState(loginData['selectedScene']);
        if(!await this.validateInitialState(initialState)){
            let result = {
                error: true,
                message: 'There was an error with the player initial state, please contact the administrator.'
            };
            await this.events.emit('reldens.playerSceneUnavailable', this, loginData, result);
            return result;
        }
        let playerData = {
            name: loginData['new-player-name'],
            user_id: loginData.user_id,
            state: initialState
        };
        await this.events.emit('reldens.createNewPlayerBefore', loginData, playerData, this);
        return await this.playerNamesLock.queue(
            String(playerData.name).toLowerCase(),
            async () => await this.createPlayerWithAvailableName(loginData, playerData, initialState)
        );
    }

    /**
     * @param {Object<string, any>} loginData
     * @param {Object<string, any>} playerData
     * @param {Object<string, any>} initialState
     * @returns {Promise<Object<string, any>>}
     */
    async createPlayerWithAvailableName(loginData, playerData, initialState)
    {
        let isNameAvailable = false;
        try {
            isNameAvailable = await this.usersManager.isNameAvailable(playerData.name)
                && await this.crossServerNamesCheck.holdEverywhere(
                    GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME,
                    [playerData.name]
                );
        } catch(error) {
            return await this.createPlayerError(loginData, error);
        }
        if(!isNameAvailable){
            let result = {error: true, message: 'The player name is not available, please choose another name.'};
            await this.events.emit('reldens.playerNewNameUnavailable', this, loginData, isNameAvailable, result);
            return result;
        }
        let result = await this.storePlayer(loginData, playerData, initialState);
        this.crossServerNamesCheck.release(GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME, [playerData.name]);
        return result;
    }

    /**
     * @param {Object<string, any>} loginData
     * @param {Object<string, any>} playerData
     * @param {Object<string, any>} initialState
     * @returns {Promise<Object<string, any>>}
     */
    async storePlayer(loginData, playerData, initialState)
    {
        try {
            let player = await this.usersManager.createPlayer(playerData);
            if(player.related_players_state && !player.state){
                player.state = player.related_players_state;
            }
            player.state.scene = await this.playerRoomState.getRoomNameById(initialState.room_id);
            let result = {error: false, player};
            await this.events.emit('reldens.createdNewPlayer', player, loginData, this, result);
            return result;
        } catch(error) {
            return await this.createPlayerError(loginData, error);
        }
    }

    /**
     * @param {Object<string, any>} loginData
     * @param {Error} error
     * @returns {Promise<Object<string, any>>}
     */
    async createPlayerError(loginData, error)
    {
        Logger.error('Player creation error.', error.message);
        let result = {error: true, message: 'There was an error creating your player, please try again.'};
        await this.events.emit('reldens.createNewPlayerCriticalError', this, loginData, error, result);
        return result;
    }

    /**
     * @param {Object<string, any>} initialState
     * @returns {Promise<Object|false>}
     */
    async validateInitialState(initialState)
    {
        if(!initialState){
            return false;
        }
        let roomId = sc.get(initialState, 'room_id', false);
        if(false === roomId){
            return false;
        }
        return await this.roomsManager.loadRoomById(roomId);
    }

    /**
     * @param {string} roomName
     * @returns {Promise<Object<string, any>|false>}
     */
    async prepareInitialState(roomName)
    {
        let initialState = this.config.server.players.initialState;
        if(!this.roomsSelection.allowOnRegistration || !roomName){
            if(!initialState){
                Logger.critical('Initial state is not defined!');
                return false;
            }
            return initialState;
        }
        let selectedRoom = this.roomsManager.registrationAvailableRooms.some(room => room.name === roomName)
            ? await this.roomsManager.loadRoomByName(roomName)
            : false;
        if(!selectedRoom){
            if(!initialState){
                Logger.critical('Initial state is not defined!');
                return false;
            }
            return initialState;
        }
        return this.playerRoomState.getStateObjectFromRoom(selectedRoom);
    }

}

module.exports.PlayerCreation = PlayerCreation;
