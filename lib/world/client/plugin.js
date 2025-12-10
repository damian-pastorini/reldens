/**
 *
 * Reldens - World Client Plugin
 *
 */

const { DebugWorldCreator } = require('./debug-world-creator');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class WorldPlugin extends PluginInterface
{

    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        this.debugWorldCreator = false;
        if(this.validateProperties()){
            this.setupDebugMode();
        }
    }

    validateProperties()
    {
        if(!this.gameManager){
            Logger.error('Game Manager undefined in PredictionPlugin.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in PredictionPlugin.');
            return false;
        }
        return true;
    }

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
