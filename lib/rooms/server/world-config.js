/**
 *
 * Reldens - WorldConfig
 *
 */

const { WorldConst } = require('../../world/constants');
const { sc } = require('@reldens/utils');

class WorldConfig
{

    static mapWorldConfigValues(room, config)
    {
        let globalWorldConfig = config.get('server/rooms/world');
        let collisions = WorldConst.COLLISIONS;
        let collideWithAll = collisions.PLAYER
            | collisions.OBJECT
            | collisions.WALL
            | collisions.BULLET_PLAYER
            | collisions.BULLET_OBJECT
            | collisions.BULLET_OTHER
            | collisions.DROP;
        let collideExceptDrops = collisions.PLAYER
            | collisions.OBJECT
            | collisions.WALL
            | collisions.BULLET_PLAYER
            | collisions.BULLET_OBJECT
            | collisions.BULLET_OTHER;
        let collideExceptNonPlayerBullets = collisions.PLAYER
            | collisions.OBJECT
            | collisions.WALL
            | collisions.BULLET_PLAYER;
        let collideExceptObjectsAndNonPlayerBullets = collisions.PLAYER
            | collisions.WALL
            | collisions.BULLET_PLAYER;
        let collideExceptObjectsAndObjectsBullets = collisions.PLAYER
            | collisions.OBJECT
            | collisions.WALL
            | collisions.BULLET_PLAYER;
        let collidePlayersAndWalls = collisions.PLAYER | collisions.WALL;
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
            bulletsStopOnObject: sc.get(globalWorldConfig, 'bulletsStopOnObject', false),
            disableObjectsCollisionsOnChase: sc.get(globalWorldConfig, 'disableObjectsCollisionsOnChase', false),
            disableObjectsCollisionsOnReturn: sc.get(globalWorldConfig, 'disableObjectsCollisionsOnReturn', true),
            collisionsGroupsByType: sc.get(globalWorldConfig, 'collisionsGroupsByType', {
                [collisions.PLAYER]: collideWithAll,
                [collisions.OBJECT]: collideExceptNonPlayerBullets,
                [collisions.WALL]: collideWithAll,
                [collisions.BULLET_PLAYER]: collideExceptDrops,
                [collisions.BULLET_OBJECT]: collideExceptObjectsAndNonPlayerBullets,
                [collisions.BULLET_OTHER]: collideExceptObjectsAndObjectsBullets,
                [collisions.DROP]: collidePlayersAndWalls
            }),
            groupWallsVertically: sc.get(globalWorldConfig, 'groupWallsVertically', false),
            groupWallsHorizontally: sc.get(globalWorldConfig, 'groupWallsHorizontally', false)
        };
        let applyGravity = sc.get(room.customData, 'applyGravity', globalConfig.applyGravity);
        let defaultsVariations = {
            useFixedWorldStep: null !== globalConfig.useFixedWorldStep ? globalConfig.useFixedWorldStep : !applyGravity,
            timeStep: applyGravity ? 0.012 : (null !== globalConfig.timeStep ? globalConfig.timeStep : 0.04),
            maxSubSteps: applyGravity ? 2 : (null !== globalConfig.maxSubSteps ? globalConfig.maxSubSteps : 1),
            movementSpeed: applyGravity ? 160 : (null !== globalConfig.movementSpeed ? globalConfig.movementSpeed : 180),
            allowPassWallsFromBelow: null !== globalConfig.allowPassWallsFromBelow
                ? globalConfig.allowPassWallsFromBelow
                : false,
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
            bulletsStopOnObject: sc.get(room.customData, 'bulletsStopOnObject', globalConfig.bulletsStopOnObject),
            disableObjectsCollisionsOnChase: sc.get(
                room.customData,
                'disableObjectsCollisionsOnChase',
                globalConfig.disableObjectsCollisionsOnChase
            ),
            disableObjectsCollisionsOnReturn: sc.get(
                room.customData,
                'disableObjectsCollisionsOnReturn',
                globalConfig.disableObjectsCollisionsOnReturn
            ),
            collisionsGroupsByType: sc.get(
                room.customData,
                'collisionsGroupsByType',
                globalConfig.collisionsGroupsByType
            ),
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
