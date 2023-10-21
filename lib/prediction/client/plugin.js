/**
 *
 * Reldens - Prediction Client Plugin
 *
 */

const { PredictionWorldCreator } = require('./prediction-world-creator');
const { RoomEventsOverride } = require('./room-events-override');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class PredictionPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.events = sc.get(props, 'events', false);
        this.predictionWorldCreator = new PredictionWorldCreator();
        this.roomEventsOverride = new RoomEventsOverride();
        if(this.validateProperties()){
            this.listenEvents();
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

    listenEvents()
    {
        this.events.on('reldens.createEngineSceneDone', async (props) => {
            await this.predictionWorldCreator.createSceneWorld(props.currentScene);
        });
        this.events.on('reldens.createdRoomsEventsInstance', (joinedFirstRoom, gameManager) => {
            this.roomEventsOverride.createCurrentPlayerOverride(gameManager.activeRoomEvents);
            this.roomEventsOverride.playerOnChangeOverride(gameManager.activeRoomEvents);
            this.roomEventsOverride.createPlayerEngineInstanceOverride(gameManager.activeRoomEvents);
            this.roomEventsOverride.createSceneInstanceOverride(gameManager.activeRoomEvents);
        });
    }

}

module.exports.PredictionPlugin = PredictionPlugin;
