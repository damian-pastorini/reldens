/**
 *
 * Reldens - PlayerCreation
 *
 * Creates the new players of a user: validates the player name, prepares the initial state from the configured
 * initial state or the selected registration room, and stores the player with its state.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} PlayerCreationProps
 * @property {ConfigManager} config
 * @property {UsersManager} usersManager
 * @property {RoomsManager} roomsManager
 * @property {EventsManager} events
 * @property {PlayerRoomState} playerRoomState
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
    }

    /**
     * @param {Object<string, any>} loginData
     * @returns {Promise<Object<string, any>>}
     */
    async createNewPlayer(loginData)
    {
        // @TODO - BETA - Replace all result.message hardcoded values by snippets.
        let minimumPlayerNameLength = this.config.getWithoutLogs('client/players/name/minimumLength', 3);
        if(minimumPlayerNameLength > loginData['new-player-name'].toString().length){
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
        let isNameAvailable = await this.usersManager.isNameAvailable(playerData.name);
        if(!isNameAvailable){
            let result = {error: true, message: 'The player name is not available, please choose another name.'};
            await this.events.emit('reldens.playerNewNameUnavailable', this, loginData, isNameAvailable, result);
            return result;
        }
        try {
            let player = await this.usersManager.createPlayer(playerData);
            if(player.related_players_state && !player.state){
                player.state = player.related_players_state;
            }
            player.state.scene = await this.playerRoomState.getRoomNameById(initialState.room_id);
            let result = {error: false, player};
            await this.events.emit('reldens.createdNewPlayer', player, loginData, this, result);
            return result;
        } catch (error) {
            Logger.error('Player creation error.', error.message);
            let result = {error: true, message: 'There was an error creating your player, please try again.'};
            await this.events.emit('reldens.createNewPlayerCriticalError', this, loginData, error, result);
            return result;
        }
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
        let config = this.config.get('client/rooms/selection');
        let initialState = this.config.server.players.initialState;
        if(!config.allowOnRegistration || !roomName){
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
