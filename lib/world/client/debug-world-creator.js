/**
 *
 * Reldens - DebugWorldCreator
 *
 * Creates and manages the debug physics world visualization for client-side debugging.
 *
 */

const { Renderer } = require('./renderer');
const { P2world } = require('../../world/server/p2world');
const { WorldTimer } = require('../../world/world-timer');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../server/p2world').P2world} P2world
 */
class DebugWorldCreator
{

    /**
     * @param {Object} scene
     * @returns {Promise<void>}
     */
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
            worldConfig: scene.gameManager.activeRoomEvents.roomData?.worldConfig || scene.worldConfig
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

    /**
     * @param {Object} scene
     * @param {Array<Object>} validLayers
     * @returns {Object}
     */
    cloneMapJson(scene, validLayers)
    {
        // @TODO - BETA - Fix to support multiple tilesets.
        let tileset = scene.tilesets[0];
        if(!tileset){
            return {};
        }
        return Object.assign(
            {},
            (scene.cache?.tilemap?.entries?.entries[tileset.name]?.data || {}),
            {layers: validLayers}
        );
    }

    /**
     * @param {Object} scene
     * @returns {Array<Object>}
     */
    findValidLayers(scene)
    {
        let validLayers = [];
        // @TODO - BETA - Fix to support multiple tilesets.
        let tileset = scene.tilesets[0];
        if(!tileset){
            return validLayers;
        }
        for(let layer of scene.cache.tilemap.entries.entries[tileset.name].data.layers){
            if(-1 !== layer.name.indexOf('collision')){
                validLayers.push(layer);
            }
        }
        return validLayers;
    }

    /**
     * @param {Object} worldData
     * @returns {P2world}
     */
    createWorldInstance(worldData)
    {
        return new P2world(worldData);
    }

}

module.exports.DebugWorldCreator = DebugWorldCreator;
