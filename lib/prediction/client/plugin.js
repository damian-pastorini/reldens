/**
 *
 * Reldens - Prediction Client Plugin
 *
 * Client-side plugin that enables experimental client prediction feature. Hooks into game
 * initialization to override RoomEvents methods and create prediction physics worlds,
 * reducing perceived input latency by predicting movement locally before server confirmation.
 *
 */

const { PredictionWorldCreator } = require('./prediction-world-creator');
const { RoomEventsOverride } = require('./room-events-override');
const { ClientCorePlugin } = require('../../features/client/client-core-plugin');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 *
 * @typedef {Object} PredictionPluginProps
 * @property {GameManager} gameManager
 * @property {EventsManager} events
 */
class PredictionPlugin extends ClientCorePlugin
{

    /**
     * @param {PredictionPluginProps} props
     * @returns {Promise<void>}
     */
    async setup(props)
    {
        /** @type {PredictionWorldCreator} */
        this.predictionWorldCreator = new PredictionWorldCreator();
        /** @type {RoomEventsOverride} */
        this.roomEventsOverride = new RoomEventsOverride();
        if(this.setupCoreProperties(props)){
            this.listenEvents();
        }
    }

    listenEvents()
    {
        this.events.on('reldens.createEngineSceneDone', async (event) => {
            await this.predictionWorldCreator.createSceneWorld(event.currentScene);
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
