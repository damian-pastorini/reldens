/**
 *
 * Reldens - RoomsMapEditFormSubscriber
 *
 * Shared subscriber that injects the rooms map list (entitySerializedData.extraData.roomsList) into
 * an entity's edit form, so the map tile picker (the .object-tile-selector-container canvas) can render
 * the selected room's map and set the tile index on tile click. Entity edit forms that use that picker
 * (objects, rooms change points) subclass this passing their table name as entityId.
 *
 */

const { RoomsMapDataProvider } = require('../rooms-map-data-provider');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../../config/server/manager').ConfigManager} ConfigManager
 */
class RoomsMapEditFormSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {string} entityId
     * @param {ConfigManager|boolean} [config]
     */
    constructor(adminManager, entityId, config = false)
    {
        /** @type {BaseDataServer} */
        this.dataServer = adminManager.dataServer;
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {string} */
        this.entityId = entityId;
        /** @type {RoomsMapDataProvider} */
        this.roomsMapDataProvider = new RoomsMapDataProvider(this.dataServer, config);
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager is not defined for RoomsMapEditFormSubscriber: '+this.entityId);
            return false;
        }
        this.events.on('reldens.adminEditPropertiesPopulation', async (event) => {
            if(this.entityId !== event.entityId){
                return;
            }
            await this.populateRoomsMapData(event);
        });
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean|void>}
     */
    async populateRoomsMapData(event)
    {
        let renderedEditProperties = sc.get(event, 'renderedEditProperties', false);
        if(!renderedEditProperties){
            return false;
        }
        renderedEditProperties.entitySerializedData = sc.toJsonString({
            extraData: {
                roomsList: await this.roomsMapDataProvider.loadRoomsMapList()
            }
        });
    }

}

module.exports.RoomsMapEditFormSubscriber = RoomsMapEditFormSubscriber;
