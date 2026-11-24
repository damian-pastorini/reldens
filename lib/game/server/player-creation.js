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
 * unique per user, since the guests can share their names (allowDuplicateGuestNames). A creation that fails after the
 * player was stored (like the class path of an unknown id refused by its foreign key) deletes that player again. With
 * client/players/multiplePlayers/enabled off a user that already has a player can not create another one, the check
 * and the store run one at a time per user, so two creations sent at the same time never give the user two players.
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
 * @property {boolean} isMultiplePlayersEnabled
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
        /** @type {boolean} */
        this.isMultiplePlayersEnabled = props.isMultiplePlayersEnabled;
        /** @type {KeyedOperationsLock} */
        this.playerNamesLock = new KeyedOperationsLock();
        /** @type {KeyedOperationsLock} */
        this.playerUsersLock = new KeyedOperationsLock();
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
        let creationResult = {error: false, message: ''};
        await this.events.emit('reldens.createNewPlayerBefore', loginData, playerData, this, creationResult);
        if(creationResult.error){
            return creationResult;
        }
        return await this.playerUsersLock.queue(
            String(loginData.user_id),
            async () => await this.createAllowedPlayer(loginData, playerData, initialState)
        );
    }

    /**
     * @param {Object<string, any>} loginData
     * @param {Object<string, any>} playerData
     * @param {Object<string, any>} initialState
     * @returns {Promise<Object<string, any>>}
     */
    async createAllowedPlayer(loginData, playerData, initialState)
    {
        let isCreationAllowed = false;
        try {
            isCreationAllowed = this.isMultiplePlayersEnabled
                || 0 === Number(await this.usersManager.playersRepository.count({user_id: loginData.user_id}));
        } catch(error) {
            return await this.createPlayerError(loginData, error);
        }
        if(!isCreationAllowed){
            let result = {error: true, message: 'Multiple players are not allowed, you already have a player.'};
            await this.events.emit('reldens.createNewPlayerNotAllowed', this, loginData, result);
            return result;
        }
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
        let nameHoldId = false;
        try {
            nameHoldId = await this.usersManager.isNameAvailable(playerData.name)
                && await this.crossServerNamesCheck.holdEverywhere(
                    GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME,
                    [playerData.name]
                );
        } catch(error) {
            return await this.createPlayerError(loginData, error);
        }
        if(!nameHoldId){
            let result = {error: true, message: 'The player name is not available, please choose another name.'};
            await this.events.emit('reldens.playerNewNameUnavailable', this, loginData, false, result);
            return result;
        }
        let result = await this.storePlayer(loginData, playerData, initialState);
        await this.crossServerNamesCheck.release(
            GameConst.ROUTE_PATHS.CHECK_PLAYER_NAME,
            [playerData.name],
            nameHoldId
        );
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
        let player = false;
        try {
            player = await this.usersManager.createPlayer(playerData);
            if(player.related_players_state && !player.state){
                player.state = player.related_players_state;
            }
            player.state.scene = await this.playerRoomState.getRoomNameById(initialState.room_id);
            let result = {error: false, player};
            await this.events.emit('reldens.createdNewPlayer', player, loginData, this, result);
            return result;
        } catch(error) {
            await this.removeFailedPlayer(player);
            return await this.createPlayerError(loginData, error);
        }
    }

    /**
     * @param {Object|false} player
     * @returns {Promise<void>}
     */
    async removeFailedPlayer(player)
    {
        if(!player?.id){
            return;
        }
        try {
            await this.usersManager.deletePlayer(player.id);
        } catch(error) {
            Logger.critical('The player of a failed creation could not be removed.', {
                playerId: player.id,
                error: error.message
            });
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
