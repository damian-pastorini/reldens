/**
 *
 * Reldens - World Client Plugin
 *
 * Initializes the client-side world system and debug visualization features.
 *
 */

const { DebugWorldCreator } = require('./debug-world-creator');
const { ClientCorePlugin } = require('../../features/client/client-core-plugin');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class WorldPlugin extends ClientCorePlugin
{

    /**
     * @param {Object} props
     * @returns {Promise<void>}
     */
    async setup(props)
    {
        /** @type {Object|boolean} */
        this.debugWorldCreator = false;
        if(this.setupCoreProperties(props)){
            this.setupDebugMode();
        }
    }

    /**
     * @returns {boolean}
     */
    setupDebugMode()
    {
        if(!this.gameManager.config.getWithoutLogs('client/world/debug/enabled', false)){
            return false;
        }
        this.debugWorldCreator = new DebugWorldCreator();
        this.events.on('reldens.createEngineSceneDone', async (event) => {
            await this.debugWorldCreator.createSceneWorld(event.currentScene);
        });
    }

}

module.exports.WorldPlugin = WorldPlugin;
