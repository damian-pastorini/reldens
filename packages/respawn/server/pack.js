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
    }

}

module.exports.RespawnPack = RespawnPack;
