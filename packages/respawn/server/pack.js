/**
 *
 * Reldens - Respawn Server Package
 *
 */

const { EventsManager } = require('../../game/events-manager');
const { RespawnArea } = require('./respawn-area');
const { PackInterface } = require('../../features/server/pack-interface');

class RespawnPack extends PackInterface
{

    setupPack()
    {
        EventsManager.on('reldens.parsingMapLayerBefore', async (layer, world) => {
            if(layer.name.indexOf('respawn-area') !== -1){
                if(!world.respawnAreas){
                    world.respawnAreas = [];
                }
                let respawnArea = new RespawnArea(layer, world);
                await respawnArea.activateObjectsRespawn();
                world.respawnAreas.push(respawnArea);
            }
        });
        EventsManager.on('reldens.sceneRoomOnCreate', async (room) => {
            // @TODO: improve.
            // append all the room objects body state to the room state:
            if(room.roomWorld && room.roomWorld.respawnAreas && room.roomWorld.respawnAreas.length){
                for(let area of room.roomWorld.respawnAreas){
                    for(let listIdx in area.instancesCreated){
                        let list = area.instancesCreated[listIdx];
                        for(let objInstance of list){
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
