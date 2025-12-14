/**
 *
 * Reldens - Respawn Server Plugin
 *
 * Server plugin that handles respawn area initialization, listens to map parsing events, and manages object instance creation in room states.
 *
 */

const { RoomRespawn } = require('./room-respawn');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 *
 * @typedef {Object} RespawnPluginSetupProps
 * @property {EventsManager} events
 * @property {ConfigManager} config
 * @property {BaseDataServer} dataServer
 */
class RespawnPlugin extends PluginInterface
{

    /**
     * @param {RespawnPluginSetupProps} props
     * @returns {Promise<void>}
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RespawnPlugin.');
        }
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in RespawnPlugin.');
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in RespawnPlugin.');
        }
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.critical('Undefined events on RespawnPlugin.');
            return false;
        }
        this.events.on('reldens.parsingMapLayersAfterBodiesQueue', async (eventData = {}) => {
            let {layer, world} = eventData;
            if(!layer || !layer.name){
                Logger.error('Undefined layer data.', layer, layer.name);
                return;
            }
            if(!world){
                Logger.error('Undefined world data.', world);
                return;
            }
            await this.createRoomRespawnArea(layer, world);
        });
        this.events.on('reldens.sceneRoomOnCreate', this.createRespawnAreasObjectsInstances.bind(this));
    }

    /**
     * @param {Object} room
     * @returns {boolean}
     */
    createRespawnAreasObjectsInstances(room)
    {
        // @TODO - BETA - Improve.
        // append all the room objects body state to the room state:
        if(!room.roomWorld || !room.roomWorld.respawnAreas){
            return false;
        }
        let respawnAreasKeys = Object.keys(room.roomWorld.respawnAreas);
        if(0 === respawnAreasKeys.length){
            return;
        }
        for(let a of respawnAreasKeys){
            let area = room.roomWorld.respawnAreas[a];
            // @NOTE: the instancesCreated are each respawn definition for each enemy type for the specified
            // layer in the storage.
            this.createRespawnObjectsInstances(area, room);
        }
    }

    /**
     * @param {Object} area
     * @param {Object} room
     */
    createRespawnObjectsInstances(area, room)
    {
        for(let i of Object.keys(area.instancesCreated)){
            let instanceObjects = area.instancesCreated[i];
            // each instance is an array of objects:
            this.createRespawnObjectsInstancesInState(instanceObjects, room);
        }
    }

    /**
     * @param {Array<Object>} instanceObjects
     * @param {Object} room
     */
    createRespawnObjectsInstancesInState(instanceObjects, room)
    {
        for(let objInstance of instanceObjects){
            // @NOTE: for these objects we associate the state to get the position automatically
            // updated on the client.
            if(!objInstance.hasState){
                continue;
            }
            room.state.addBodyToState(objInstance.state, objInstance.client_key);
        }
    }

    /**
     * @param {Object} layer
     * @param {Object} world
     * @returns {Promise<void>}
     */
    async createRoomRespawnArea(layer, world)
    {
        if(-1 === layer.name.indexOf('respawn-area')){
            Logger.debug('None respawn area for layer "'+layer.name+'".');
            return;
        }
        if(!world.respawnAreas){
            world.respawnAreas = {};
        }
        let respawnArea = new RoomRespawn({
            layer,
            world,
            events: this.events,
            dataServer: this.dataServer,
            config: this.config
        });
        await respawnArea.activateObjectsRespawn();
        world.respawnAreas[layer.name] = respawnArea;
    }
}

module.exports.RespawnPlugin = RespawnPlugin;
