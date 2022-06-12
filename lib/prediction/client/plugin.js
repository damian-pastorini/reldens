/**
 *
 * Reldens - Prediction Client Plugin
 *
 */

const { PredictionWorldCreator } = require('./prediction-world-creator');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class PredictionPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.events = sc.get(props, 'events', false);
        this.predictionWorldCreator = new PredictionWorldCreator();
        if(this.validateProperties()){
            this.listenEvents();
        }
    }

    listenEvents()
    {
        this.events.on('reldens.createEngineSceneDone', async (props) => {
            await this.predictionWorldCreator.createSceneWorld(props.currentScene);
        });
    }

    validateProperties()
    {
        if (!this.gameManager) {
            Logger.error('Game Manager undefined in PredictionPlugin.');
            return false;
        }
        if (!this.events) {
            Logger.error('EventsManager undefined in PredictionPlugin.');
            return false;
        }
        return true;
    }
}

module.exports.PredictionPlugin = PredictionPlugin;
