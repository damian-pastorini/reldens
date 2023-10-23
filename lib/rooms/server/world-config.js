/**
 *
 * Reldens - WorldConfig
 *
 */

const { sc } = require('@reldens/utils');

class WorldConfig
{

    static mapWorldConfigValues(room, config)
    {
        let globalWorldConfig = config.get('server/rooms/world');
        let globalConfig = {
            applyGravity: sc.get(globalWorldConfig, 'applyGravity', false),
            gravity: sc.get(globalWorldConfig, 'gravity', [0, 0]),
            globalStiffness: sc.get(globalWorldConfig, 'globalStiffness', 1000000000),
            globalRelaxation: sc.get(globalWorldConfig, 'globalRelaxation', 10),
            useFixedWorldStep: sc.get(globalWorldConfig, 'useFixedWorldStep', null),
            timeStep: sc.get(globalWorldConfig, 'timeStep', null),
            maxSubSteps: sc.get(globalWorldConfig, 'maxSubSteps', null),
            movementSpeed: sc.get(globalWorldConfig, 'movementSpeed', null),
            allowPassWallsFromBelow: sc.get(globalWorldConfig, 'allowPassWallsFromBelow', null),
            jumpSpeed: sc.get(globalWorldConfig, 'jumpSpeed', 540),
            jumpTimeMs: sc.get(globalWorldConfig, 'jumpTimeMs', 180),
            tryClosestPath: sc.get(globalWorldConfig, 'tryClosestPath'),
            onlyWalkable: sc.get(globalWorldConfig, 'onlyWalkable'),
            wallsMassValue: sc.get(globalWorldConfig, 'wallsMassValue', 1),
            playerMassValue: sc.get(globalWorldConfig, 'playerMassValue', 1),
            bulletsStopOnPlayer: sc.get(globalWorldConfig, 'bulletsStopOnPlayer', true),
            groupWallsVertically: sc.get(globalWorldConfig, 'groupWallsVertically', false),
            groupWallsHorizontally: sc.get(globalWorldConfig, 'groupWallsHorizontally', false)
        }
        let applyGravity = sc.get(room.customData, 'applyGravity', globalConfig.applyGravity);
        let defaultsVariations = {
            useFixedWorldStep: null !== globalConfig.useFixedWorldStep ? globalConfig.useFixedWorldStep : !applyGravity,
            timeStep: null !== globalConfig.timeStep ? globalConfig.timeStep : (applyGravity ? 0.012 : 0.04),
            maxSubSteps: null !== globalConfig.maxSubSteps ? globalConfig.maxSubSteps : (applyGravity ? 5 : 1),
            movementSpeed: null !== globalConfig.movementSpeed
                ? globalConfig.movementSpeed : (applyGravity ? 200 : 180),
            allowPassWallsFromBelow: null !== globalConfig.allowPassWallsFromBelow
                ? globalConfig.allowPassWallsFromBelow : false,
        };
        let worldConfig = {
            applyGravity,
            gravity: sc.get(room.customData, 'gravity', globalConfig.gravity),
            globalStiffness: sc.get(room.customData, 'globalStiffness', globalConfig.globalStiffness),
            globalRelaxation: sc.get(room.customData, 'globalRelaxation', globalConfig.globalRelaxation),
            useFixedWorldStep: sc.get(room.customData, 'useFixedWorldStep', defaultsVariations.useFixedWorldStep),
            timeStep: sc.get(room.customData, 'timeStep', defaultsVariations.timeStep),
            maxSubSteps: sc.get(room.customData, 'maxSubSteps', defaultsVariations.maxSubSteps),
            movementSpeed: sc.get(room.customData, 'movementSpeed', defaultsVariations.movementSpeed),
            allowPassWallsFromBelow: sc.get(
                room.customData,
                'allowPassWallsFromBelow',
                defaultsVariations.allowPassWallsFromBelow
            ),
            jumpSpeed: sc.get(room.customData, 'jumpSpeed', globalConfig.jumpSpeed),
            jumpTimeMs: sc.get(room.customData, 'jumpTimeMs', globalConfig.jumpTimeMs),
            tryClosestPath: sc.get(room.customData, 'tryClosestPath', globalConfig.tryClosestPath),
            onlyWalkable: sc.get(room.customData, 'onlyWalkable', globalConfig.onlyWalkable),
            wallsMassValue: sc.get(room.customData, 'wallsMassValue', globalConfig.wallsMassValue),
            playerMassValue: sc.get(room.customData, 'playerMassValue', globalConfig.playerMassValue),
            bulletsStopOnPlayer: sc.get(room.customData, 'bulletsStopOnPlayer', globalConfig.bulletsStopOnPlayer),
            groupWallsVertically: sc.get(room.customData, 'groupWallsVertically', globalConfig.groupWallsVertically),
            groupWallsHorizontally: sc.get(
                room.customData,
                'groupWallsHorizontally',
                globalConfig.groupWallsHorizontally
            )
        };
        if(!room.worldConfig){
            room.worldConfig = {};
        }
        Object.assign(room.worldConfig, worldConfig);
    }
    
}

module.exports.WorldConfig = WorldConfig;
