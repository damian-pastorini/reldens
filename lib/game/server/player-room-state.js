/**
 *
 * Reldens - PlayerRoomState
 *
 * Builds the player state placed in a room, on the room default return point or on the default position, and
 * resolves the room name of a player state room ID. Used by the login selected scene and the new players creation.
 *
 */

const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../constants');

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

}

module.exports.PlayerRoomState = PlayerRoomState;
