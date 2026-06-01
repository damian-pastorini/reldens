/**
 *
 * Reldens - MapElementsCustomDataWriter
 *
 * After a map import finishes, writes the tilesetSessionId and mapElementsFile pointers
 * into rooms.customData for every room the importer just created. Lets the editor's
 * priority chain recover the originating session when no sidecar is found.
 *
 */

const { MapElementsBuilder } = require('./map-elements-builder');
const { RoomCustomData } = require('../../rooms/server/room-custom-data');
const { Logger, sc } = require('@reldens/utils');

class MapElementsCustomDataWriter
{

    /**
     * @param {Object} mapsImporter
     */
    constructor(mapsImporter)
    {
        /** @type {Object} */
        this.mapsImporter = mapsImporter;
        /** @type {MapElementsBuilder} */
        this.elementsBuilder = new MapElementsBuilder();
    }

    /**
     * @param {Object} body
     * @returns {Promise<void>}
     */
    async write(body)
    {
        let tilesetSessionId = sc.get(body, 'tilesetSessionId', '').replace(/[^a-zA-Z0-9-]/g, '');
        if(!tilesetSessionId){
            return;
        }
        if(!this.mapsImporter){
            return;
        }
        let roomsRepository = sc.get(this.mapsImporter, 'roomsRepository', null);
        if(!roomsRepository){
            return;
        }
        let createdRooms = sc.get(this.mapsImporter, 'createdRooms', {});
        for(let mapName of Object.keys(createdRooms)){
            await this.updateRoom(roomsRepository, createdRooms[mapName], mapName, tilesetSessionId);
        }
    }

    /**
     * @param {Object} roomsRepository
     * @param {Object} room
     * @param {string} mapName
     * @param {string} tilesetSessionId
     * @returns {Promise<void>}
     */
    async updateRoom(roomsRepository, room, mapName, tilesetSessionId)
    {
        if(!room){
            return;
        }
        if(!room.id){
            return;
        }
        let customData = new RoomCustomData(room.customData);
        customData.set('tilesetSessionId', tilesetSessionId);
        customData.set('mapElementsFile', this.elementsBuilder.elementsFileName(mapName));
        try {
            await roomsRepository.updateById(room.id, {customData: customData.toJsonString()});
        } catch(error) {
            Logger.error('Could not write customData for room.', mapName, error);
        }
    }
}

module.exports.MapElementsCustomDataWriter = MapElementsCustomDataWriter;
