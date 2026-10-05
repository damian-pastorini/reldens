/**
 *
 * Reldens - RoomEnabler
 *
 * Flips rooms.customData.enabled to true and persists it so a room can be loaded on the next restart.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { RoomCustomData } = require('./room-custom-data');

class RoomEnabler
{

    /**
     * @param {import('@reldens/storage').BaseDriver} roomsRepository
     */
    constructor(roomsRepository)
    {
        this.roomsRepository = roomsRepository;
    }

    /**
     * @param {number|string} roomId
     * @returns {Promise<boolean>}
     */
    async enableById(roomId)
    {
        let room = await this.roomsRepository.loadOneBy('id', roomId);
        if(!room){
            Logger.error('Room not found to be enabled.', roomId);
            return false;
        }
        let roomCustomData = new RoomCustomData(sc.get(room, 'customData', ''));
        if(true === roomCustomData.get('enabled', false)){
            return true;
        }
        roomCustomData.set('enabled', true);
        return await this.roomsRepository.updateById(roomId, {customData: roomCustomData.toJsonString()});
    }

}

module.exports.RoomEnabler = RoomEnabler;
