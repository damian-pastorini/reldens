/**
 *
 * Reldens - ObjectsEntitySubscriber
 *
 * Subscriber that injects the rooms map data into the objects edit form, so the tile selector
 * canvas can render the map of the selected room and set the tile index on tile click.
 *
 */

const { RoomsMapDataProvider } = require('../rooms-map-data-provider');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 */
class ObjectsEntitySubscriber
{

    /**
     * @param {AdminManager} adminManager
     */
    constructor(adminManager)
    {
        /** @type {BaseDataServer} */
        this.dataServer = adminManager.dataServer;
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {RoomsMapDataProvider} */
        this.roomsMapDataProvider = new RoomsMapDataProvider(this.dataServer);
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager is not defined for ObjectsEntitySubscriber.');
            return false;
        }
        this.events.on('reldens.adminEditPropertiesPopulation', async (event) => {
            if('objects' !== event.entityId){
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
        renderedEditProperties.objectsRoomsData = JSON.stringify(await this.roomsMapDataProvider.loadRoomsMapList())
            .replace(/"/g, '&quot;');
    }

}

module.exports.ObjectsEntitySubscriber = ObjectsEntitySubscriber;
