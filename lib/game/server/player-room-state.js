/**
 *
 * Reldens - PlayerRoomState
 *
 * Builds the player state placed in a room, on the room default return point or on the default position, and
 * resolves the room name of a player state room ID. On login it maps the stored state of the user players and sets
 * their scene, placing them in the selected scene when the selection on login is allowed, and a player whose stored
 * room is missing (a deleted room unlinks the state room) on the default room return point. Used by the login and the
 * new players creation.
 *
 */

const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} PlayerRoomStateProps
 * @property {ConfigManager} config
 * @property {RoomsManager} roomsManager
 */
class PlayerRoomState
{

    /**
     * @param {PlayerRoomStateProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {RoomsManager} */
        this.roomsManager = props.roomsManager;
        /** @type {{x: number, y: number, dir: string}} */
        this.defaultStatePosition = {
            x: props.config.get('client/map/tileData/width', 32) * 2,
            y: props.config.get('client/map/tileData/height', 32) * 2,
            dir: GameConst.DOWN
        };
    }

    /**
     * @param {Object} selectedRoom
     * @returns {Object<string, any>}
     */
    getStateObjectFromRoom(selectedRoom)
    {
        let stateData = Object.assign({room_id: selectedRoom.roomId}, this.defaultStatePosition);
        if(selectedRoom.returnPointDefault){
            stateData.x = selectedRoom.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.X];
            stateData.y = selectedRoom.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.Y];
            stateData.dir = selectedRoom.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.DIRECTION];
        }
        return stateData;
    }

    /**
     * @param {number} roomId
     * @returns {Promise<string>}
     */
    async getRoomNameById(roomId)
    {
        let playerRoom = await this.roomsManager.loadRoomById(roomId);
        if(playerRoom){
            return playerRoom.roomName;
        }
        return GameConst.ROOM_NAME_MAP;
    }

    /**
     * @param {Array<Object>} players
     */
    mapPlayerStateRelation(players)
    {
        if(!sc.isArray(players)){
            return;
        }
        for(let player of players){
            if(player.related_players_state && !player.state){
                player.state = player.related_players_state;
            }
        }
    }

    /**
     * @param {Array<Object>} players
     * @param {string} [selectedScene]
     * @returns {Promise<void>}
     */
    async setSceneOnPlayers(players, selectedScene)
    {
        for(let player of players){
            if(!player.state){
                continue;
            }
            if(
                this.config.get('client/rooms/selection').allowOnLogin
                && selectedScene
                && RoomsConst.ROOM_LAST_LOCATION_KEY !== selectedScene
                && this.roomsManager.loginAvailableRooms.some(room => room.name === selectedScene)
            ){
                await this.applySelectedLocation(player, selectedScene);
            }
            let playerRoom = player.state.room_id ? await this.roomsManager.loadRoomById(player.state.room_id) : false;
            if(!playerRoom){
                playerRoom = await this.placeOnDefaultRoom(player);
            }
            player.state.scene = playerRoom ? playerRoom.roomName : GameConst.ROOM_NAME_MAP;
        }
    }

    /**
     * @param {Object} player
     * @returns {Promise<Object|boolean>}
     */
    async placeOnDefaultRoom(player)
    {
        let defaultRoom = await this.roomsManager.loadRoomById(
            this.config.get('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, false)
        );
        if(!defaultRoom){
            Logger.error('The player "'+player.id+'" room and the default room were not found.');
            return false;
        }
        Logger.info('The room of the player "'+player.id+'" was not found, the player is placed in the default room.');
        Object.assign(player.state, this.getStateObjectFromRoom(defaultRoom));
        return defaultRoom;
    }

    /**
     * @param {Object} player
     * @param {string} selectedScene
     * @returns {Promise<boolean|void>}
     */
    async applySelectedLocation(player, selectedScene)
    {
        let selectedRoom = await this.roomsManager.loadRoomByName(selectedScene);
        if(!selectedRoom){
            return false;
        }
        player.state = this.getStateObjectFromRoom(selectedRoom);
    }

}

module.exports.PlayerRoomState = PlayerRoomState;
