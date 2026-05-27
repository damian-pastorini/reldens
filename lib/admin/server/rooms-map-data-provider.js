/**
 *
 * Reldens - RoomsMapDataProvider
 *
 * Loads the rooms list including each room map file and images, used to render the admin map
 * canvas for the rooms link creator and the objects tile selector.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 */
class RoomsMapDataProvider
{

    /**
     * @param {BaseDataServer} dataServer
     */
    constructor(dataServer)
    {
        /** @type {BaseDataServer} */
        this.dataServer = dataServer;
    }

    /**
     * @returns {Promise<Array<Object>>}
     */
    async loadRoomsMapList()
    {
        let roomsRepository = this.dataServer?.getEntity('rooms');
        if(!roomsRepository){
            Logger.error('Rooms repository is not available for RoomsMapDataProvider.');
            return [];
        }
        return (await roomsRepository.loadAll() || []).map((room) => {
            return {id: room.id, name: room.name, mapFile: room.map_filename, mapImages: room.scene_images};
        });
    }

}

module.exports.RoomsMapDataProvider = RoomsMapDataProvider;
