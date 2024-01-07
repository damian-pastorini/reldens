/**
 *
 * Reldens - DebugWorldCreator
 *
 */

const { Renderer } = require('./renderer');
const { P2world } = require('../../world/server/p2world');
const { WorldTimer } = require('../../world/world-timer');
const { Logger } = require('@reldens/utils');

class DebugWorldCreator
{

    async createSceneWorld(scene)
    {
        let validLayers = this.findValidLayers(scene);
        let mapJson = this.cloneMapJson(scene, validLayers);
        let worldData = {
            sceneName: scene.key,
            roomId: scene.params.roomId,
            roomMap: scene.params.roomName,
            mapJson,
            config: scene.configManager,
            events: scene.eventsManager,
            allowSimultaneous: scene.configManager.get('client/general/controls/allowSimultaneousKeys', true),
            worldConfig: scene.gameManager.activeRoomEvents.sceneData?.worldConfig || scene.worldConfig
        };
        scene.debugWorld = this.createWorldInstance(worldData);
        scene.debugWorld.createLimits();
        await scene.debugWorld.createWorldContent({});
        scene.debugWorldTimer = new WorldTimer({
            callbacks: [() => {
                if(!scene.debugWorld){
                    Logger.error('Scene World not longer exists.', scene.roomWorld);
                    return;
                }
                scene.debugWorld.removeBodiesFromWorld();
            }]
        });
        scene.debugWorldTimer.startWorldSteps(scene.debugWorld);
        scene.debugWorldRenderer = new Renderer(scene);
    }

    cloneMapJson(scene, validLayers)
    {
        return Object.assign(
            {},
            (scene.cache?.tilemap?.entries?.entries[scene.tileset.name]?.data || {}),
            {layers: validLayers}
        );
    }

    findValidLayers(scene)
    {
        let validLayers = [];
        for(let layer of scene.cache.tilemap.entries.entries[scene.tileset.name].data.layers){
            if(-1 !== layer.name.indexOf('collision')){
                validLayers.push(layer);
            }
        }
        return validLayers;
    }

    createWorldInstance(worldData)
    {
        return new P2world(worldData);
    }

}

module.exports.DebugWorldCreator = DebugWorldCreator;
