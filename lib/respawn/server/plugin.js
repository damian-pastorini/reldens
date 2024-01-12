/**
 *
 * Reldens - Respawn Server Plugin
 *
 */

const { RoomRespawn } = require('./room-respawn');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class RespawnPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RespawnPlugin.');
        }
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in RespawnPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in RespawnPlugin.');
        }
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.critical('Undefined events on RespawnPlugin.');
            return false;
        }
        this.events.on('reldens.parsingMapLayerBefore', async (eventData = {}) => {
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
        this.events.on('reldens.sceneRoomOnCreate', this.createRespawnObjectsInstances.bind(this));
    }

    createRespawnObjectsInstances(room)
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
            for(let i of Object.keys(area.instancesCreated)){
                let instanceObjects = area.instancesCreated[i];
                // each instance is an array of objects:
                for(let objInstance of instanceObjects){
                    // @NOTE: for these objects we associate the state to get the position automatically
                    // updated on the client.
                    if(!objInstance.hasState){
                        continue;
                    }
                    // @TODO - BETA - Refactor and extract Colyseus into a driver.
                    room.state.bodies.set(objInstance.client_key, objInstance.state);
                }
            }
        }
    }

    async createRoomRespawnArea(layer, world)
    {
        if(-1 === layer.name.indexOf('respawn-area')){
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
