/**
 *
 * Reldens - Prediction World Creator
 *
 */

const { CollisionsManager } = require('../../world/server/collisions-manager');
const { P2world } = require('../../world/server/p2world');
const { WorldPointsValidator } = require('../../world/world-points-validator');
const { WorldTimer } = require('../../world/world-timer');
const { Logger } = require('@reldens/utils');

class PredictionWorldCreator
{

    async createSceneWorld(scene)
    {
        if(!scene.clientPrediction){
            return;
        }
        let validLayers = [];
        for(let layer of scene.cache.tilemap.entries.entries[scene.tileset.name].data.layers){
            if(-1 !== layer.name.indexOf('collision')){
                validLayers.push(layer);
            }
        }
        let mapJson = Object.assign(
            {},
            (scene.cache?.tilemap?.entries?.entries[scene.tileset.name]?.data || {}),
            {layers: validLayers}
        );
        let worldData = {
            sceneName: scene.key,
            roomId: scene.params.roomId,
            roomMap: scene.params.roomMap,
            mapJson,
            config: scene.configManager,
            events: scene.eventsManager,
            allowSimultaneous: scene.allowSimultaneous,
            worldConfig: scene.gameManager.activeRoomEvents.sceneData?.worldConfig || scene.worldConfig
        };
        scene.worldPrediction = this.createWorldInstance(worldData);
        // create world limits:
        scene.worldPrediction.createLimits();
        // add collisions:
        await scene.worldPrediction.createWorldContent({});
        let currentPlayer = scene.gameManager.getCurrentPlayer();
        if(!currentPlayer){
            Logger.error('Current player not present for prediction.');
            return;
        }
        let playerData = {
            id: currentPlayer.playerId,
            width: scene.configManager.get('client/players/physicalBody/width'),
            height: scene.configManager.get('client/players/physicalBody/height'),
            bodyState: {
                x: currentPlayer.state.x,
                y: currentPlayer.state.y
            }
        };
        currentPlayer.predictionBody = scene.worldPrediction.createPlayerBody(playerData);
        this.worldPredictionTimer = new WorldTimer({
            world: scene.worldPrediction,
            callbacks: [() => { scene.worldPrediction.removeBodiesFromWorld(); }]
        });
        this.worldPredictionTimer.startWorldSteps();
        scene.collisionsManager = new CollisionsManager({roomWorld: scene.worldPrediction});
        currentPlayer.pointsValidator = new WorldPointsValidator(mapJson.width, mapJson.height);
    }

    createWorldInstance(worldData)
    {
        return new P2world(worldData);
    }
}

module.exports.PredictionWorldCreator = PredictionWorldCreator;
