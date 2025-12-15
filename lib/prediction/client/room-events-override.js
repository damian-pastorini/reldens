/**
 *
 * Reldens - Room Events Override
 *
 * Overrides core RoomEvents methods to enable client-side prediction functionality.
 * Modifies player creation, position updates, scene instantiation, and player engine initialization
 * to support experimental prediction features for reduced perceived latency.
 *
 */

const { PlayerEnginePrediction} = require('./player-engine-prediction');
const { SceneDynamic } = require('../../game/client/scene-dynamic');

/**
 * @typedef {import('../../game/client/room-events').RoomEvents} RoomEvents
 */
class RoomEventsOverride
{

    /**
     * @param {RoomEvents} roomEvents
     */
    createCurrentPlayerOverride(roomEvents)
    {
        roomEvents.createCurrentPlayer = async (player, previousScene, key) => {
            roomEvents.engineStarted = true;
            await roomEvents.startEngineScene(player, roomEvents.room, previousScene);
            let currentScene = roomEvents.getActiveScene();
            if(!roomEvents.isValidScene(currentScene, player)){
                return false;
            }
            // process players queue after player was created:
            await roomEvents.events.emit('reldens.playersQueueBefore', player, key, previousScene, roomEvents);
            for(let i of Object.keys(roomEvents.playersQueue)){
                currentScene.player.addPlayer(i, roomEvents.playersQueue[i]);
            }
            if(currentScene.experimentalClientPrediction){
                currentScene.player.positionFromServer = player;
            }
            let eventData = {player, key, previousScene, roomEvents: roomEvents};
            await roomEvents.events.emit('reldens.createCurrentPlayer', eventData);
            return eventData;
        };
    }

    /**
     * @param {RoomEvents} roomEvents
     */
    playerOnChangeOverride(roomEvents)
    {
        roomEvents.playersOnChange = (player, key, from) => {
            // do not move the player if it is changing the scene:
            if(player.state.scene !== roomEvents.roomName){
                return;
            }
            let currentScene = roomEvents.getActiveScene();
            if(!roomEvents.playerExists(currentScene, key)){
                return;
            }
            if(currentScene.experimentalClientPrediction && roomEvents.isCurrentPlayer(key)){
                currentScene.player.positionFromServer = player;
                return;
            }
            currentScene.player.updatePlayer(key, player);
        };
    }

    /**
     * @param {RoomEvents} roomEvents
     */
    createSceneInstanceOverride(roomEvents)
    {
        roomEvents.createSceneInstance = (sceneName, sceneData, gameManager) => {
            let newSceneDynamic = new SceneDynamic(sceneName, sceneData, gameManager);
            newSceneDynamic.experimentalClientPrediction = gameManager.config.get(
                'client/general/engine/experimentalClientPrediction'
            );
            newSceneDynamic.worldPrediction = false;
            return newSceneDynamic;
        }
    }

    /**
     * @param {RoomEvents} roomEvents
     */
    createPlayerEngineInstanceOverride(roomEvents)
    {
        roomEvents.createPlayerEngineInstance = (currentScene, player, gameManager, room) => {
            return new PlayerEnginePrediction({scene: currentScene, playerData: player, gameManager, room});
        };
    }
}

module.exports.RoomEventsOverride = RoomEventsOverride;
