/**
 *
 * Reldens - Prediction World Creator
 *
 */

const { CollisionsManager } = require('../../world/server/collisions-manager');
const { P2world } = require('../../world/server/p2world');
const { WorldPointsValidator } = require('../../world/world-points-validator');
const { WorldTimer } = require('../../world/world-timer');
const { Logger, sc } = require('@reldens/utils');

class PredictionWorldCreator
{

    /**
     * @param {SceneDynamic} scene
     * @returns {Promise<void>}
     */
    async createSceneWorld(scene)
    {
        if(!scene.experimentalClientPrediction){
            return;
        }
        let validLayers = this.findValidLayers(scene);
        let mapJson = this.cloneMapJson(scene, validLayers);
        let worldData = {
            sceneName: scene.key,
            roomId: scene.params.roomId,
            roomMap: scene.params.roomMap,
            mapJson,
            config: scene.configManager,
            events: scene.eventsManager,
            allowSimultaneous: scene.configManager.get('client/general/controls/allow_simultaneous_keys') || true,
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
            bodyState: currentPlayer.state
        };
        let predictionBody = scene.worldPrediction.createPlayerBody(playerData);
        predictionBody.updateBodyState = this.updateBodyStateOverride(predictionBody, currentPlayer);
        currentPlayer.predictionBody = predictionBody;
        scene.worldPredictionTimer = new WorldTimer({
            world: scene.worldPrediction,
            callbacks: [() => { scene.worldPrediction.removeBodiesFromWorld(); }]
        });
        scene.worldPredictionTimer.startWorldSteps();
        scene.collisionsManager = new CollisionsManager({roomWorld: scene.worldPrediction});
        currentPlayer.pointsValidator = new WorldPointsValidator(mapJson.width, mapJson.height);
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
            if (-1 !== layer.name.indexOf('collision')){
                validLayers.push(layer);
            }
        }
        return validLayers;
    }

    updateBodyStateOverride(predictionBody, currentPlayer)
    {
        return () => {
            if(!sc.hasOwn(predictionBody.bodyState, 'x') || !sc.hasOwn(predictionBody.bodyState, 'y')){
                return;
            }
            if(!predictionBody.position[0] || !predictionBody.position[1]){
                return;
            }
            // only update the body if it moves:
            if(predictionBody.isNotMoving()){
                predictionBody.bodyState.mov = false;
                return;
            }
            // update position:
            if(predictionBody.bodyState.x !== predictionBody.position[0]){
                predictionBody.bodyState.x = predictionBody.position[0];
            }
            if(predictionBody.bodyState.y !== predictionBody.position[1]){
                predictionBody.bodyState.y = predictionBody.position[1];
            }
            // start or stop animation:
            let newStateMov = 0 !== Number(Number(predictionBody.velocity[0]).toFixed(2))
                || 0 !== Number(predictionBody.velocity[1].toFixed(2));
            if(predictionBody.bodyState.mov !== newStateMov){
                predictionBody.bodyState.mov = newStateMov;
            }
            let state = {
                x: predictionBody.position[0],
                y: predictionBody.position[1],
                dir: predictionBody.bodyState.dir
            };
            currentPlayer.updatePlayer(currentPlayer.playerId, {state});
        };
    }

    createWorldInstance(worldData)
    {
        return new P2world(worldData);
    }
}

module.exports.PredictionWorldCreator = PredictionWorldCreator;
