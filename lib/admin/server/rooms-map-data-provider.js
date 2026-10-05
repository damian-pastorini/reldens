/**
 *
 * Reldens - RoomsMapDataProvider
 *
 * Loads the rooms list including each room map file, images and map layers names, used to render the admin map
 * canvas for the rooms link creator, the objects tile selector and the objects layer name selector.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../config/server/manager').ConfigManager} ConfigManager
 */
class RoomsMapDataProvider
{

    /**
     * @param {BaseDataServer} dataServer
     * @param {ConfigManager|boolean} [config]
     */
    constructor(dataServer, config = false)
    {
        /** @type {BaseDataServer} */
        this.dataServer = dataServer;
        /** @type {ConfigManager|boolean} */
        this.config = config;
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
        let loadedRooms = await roomsRepository.loadAll();
        if(!sc.isArray(loadedRooms)){
            return [];
        }
        return loadedRooms.map((room) => {
            return {
                id: room.id,
                name: room.name,
                mapFile: room.map_filename,
                mapImages: room.scene_images,
                layers: this.fetchMapLayersNames(room.map_filename)
            };
        });
    }

    /**
     * @param {string} mapFileName
     * @returns {Array<string>}
     */
    fetchMapLayersNames(mapFileName)
    {
        if(!this.config || !mapFileName){
            return [];
        }
        let mapKey = String(mapFileName).replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '');
        let mapJson = sc.get(this.config.getWithoutLogs('server/maps', {}), mapKey, false);
        if(!mapJson || !sc.isArray(mapJson.layers)){
            return [];
        }
        return mapJson.layers.map((layer) => layer.name);
    }

}

module.exports.RoomsMapDataProvider = RoomsMapDataProvider;
