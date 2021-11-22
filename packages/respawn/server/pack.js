/**
 *
 * Reldens - Respawn Server Package
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { RoomRespawn } = require('./room-respawn');
const { PackInterface } = require('../../features/pack-interface');

class RespawnPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RespawnPack.');
        }
        this.dataServer = sc.getDef(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in RespawnPack.');
        }
        this.events.on('reldens.parsingMapLayerBefore', async (layer, world) => {
            if(layer.name.indexOf('respawn-area') !== -1){
                if(!world.respawnAreas){
                    world.respawnAreas = {};
                }
                let respawnArea = new RoomRespawn({layer, world, events: this.events, dataServer: this.dataServer});
                await respawnArea.activateObjectsRespawn();
                world.respawnAreas[layer.name] = respawnArea;
            }
        });
        this.events.on('reldens.sceneRoomOnCreate', async (room) => {
            // @TODO - BETA - Improve.
            // append all the room objects body state to the room state:
            if(room.roomWorld && room.roomWorld.respawnAreas){
                for(let a of Object.keys(room.roomWorld.respawnAreas)){
                    let area = room.roomWorld.respawnAreas[a];
                    // @NOTE: the instancesCreated are each respawn definition for each enemy type for the specified
                    // layer in the storage.
                    for(let i of Object.keys(area.instancesCreated)){
                        let instanceObjects = area.instancesCreated[i];
                        // each instance is an array of objects:
                        for(let objInstance of instanceObjects){
                            // @NOTE: for these objects we associate the state to get the position automatically
                            // updated on the client.
                            if(objInstance.hasState){
                                room.state.bodies[objInstance.client_key] = objInstance.state;
                            }
                        }
                    }
                }
            }
        });
    }

}

module.exports.RespawnPack = RespawnPack;
