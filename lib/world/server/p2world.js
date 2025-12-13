/**
 *
 * Reldens - P2world
 *
 * Physics world implementation using P2.js engine with tile map integration, collision management, and pathfinding.
 *
 */

const { World, Body, Box } = require('p2');
const { PhysicalBody } = require('./physical-body');
const { ObjectBodyState } = require('./object-body-state');
const { PathFinder } = require('./path-finder');
const { TypeDeterminer } = require('../../game/type-determiner');
const { GameConst } = require('../../game/constants');
const { RoomsConst } = require('../../rooms/constants');
const { WorldConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../config/server/manager').ConfigManager} ConfigManager
 * @typedef {import('../../objects/server/manager').ObjectsManager} ObjectsManager
 */
class P2world extends World
{

    /**
     * @param {Object} options
     */
    constructor(options)
    {
        // @TODO - BETA - Remove this class, create a driver for the physics engine.
        super(options);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(options, 'events', false);
        /** @type {number|boolean} */
        this.roomId = sc.get(options, 'roomId', false);
        /** @type {string|boolean} */
        this.sceneName = sc.get(options, 'sceneName', false);
        /** @type {string|boolean} */
        this.sceneTiledMapFile = sc.get(options, 'roomMap', false);
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(options, 'config', false);
        this.validateRequiredProperties(options);
        /** @type {Object} */
        this.mapJson = null;
        this.saveMapData(options);
        /** @type {ObjectsManager|boolean} */
        this.objectsManager = sc.get(options, 'objectsManager', false);
        /** @type {boolean} */
        this.applyGravity = sc.get(options.worldConfig, 'applyGravity', false);
        /** @type {Array<number>} */
        this.gravity = sc.get(options.worldConfig, 'gravity', [0, 0]);
        /** @type {number} */
        this.globalStiffness = sc.get(options.worldConfig, 'globalStiffness', 100000000);
        /** @type {number} */
        this.globalRelaxation = sc.get(options.worldConfig, 'globalRelaxation', 10);
        /** @type {boolean} */
        this.useFixedWorldStep = sc.get(options.worldConfig, 'useFixedWorldStep', true);
        /** @type {number} */
        this.timeStep = sc.get(options.worldConfig, 'timeStep', 0.04);
        /** @type {number} */
        this.maxSubSteps = sc.get(options.worldConfig, 'maxSubSteps', 1);
        /** @type {number} */
        this.movementSpeed = sc.get(options.worldConfig, 'movementSpeed', 180);
        /** @type {boolean} */
        this.allowPassWallsFromBelow = sc.get(options.worldConfig, 'allowPassWallsFromBelow', false);
        /** @type {number} */
        this.jumpSpeed = sc.get(options.worldConfig, 'jumpSpeed', 0);
        /** @type {number} */
        this.jumpTimeMs = sc.get(options.worldConfig, 'jumpTimeMs', 0);
        /** @type {boolean} */
        this.tryClosestPath = sc.get(options.worldConfig, 'tryClosestPath', false);
        /** @type {boolean} */
        this.onlyWalkable = sc.get(options.worldConfig, 'onlyWalkable', false);
        /** @type {number} */
        this.wallsMassValue = sc.get(options.worldConfig, 'wallsMassValue', 1);
        /** @type {number} */
        this.playerMassValue = sc.get(options.worldConfig, 'playerMassValue', 1);
        /** @type {boolean} */
        this.bulletsStopOnPlayer = sc.get(options.worldConfig, 'bulletsStopOnPlayer', true);
        /** @type {boolean} */
        this.bulletsStopOnObject = sc.get(options.worldConfig, 'bulletsStopOnObject', true);
        /** @type {boolean} */
        this.disableObjectsCollisionsOnChase = sc.get(options.worldConfig, 'disableObjectsCollisionsOnChase', false);
        /** @type {boolean} */
        this.disableObjectsCollisionsOnReturn = sc.get(options.worldConfig, 'disableObjectsCollisionsOnReturn', true);
        /** @type {boolean} */
        this.collisionsGroupsByType = sc.get(options.worldConfig, 'collisionsGroupsByType', true);
        /** @type {boolean} */
        this.groupWallsVertically = sc.get(options.worldConfig, 'groupWallsVertically', false);
        /** @type {boolean} */
        this.groupWallsHorizontally = sc.get(options.worldConfig, 'groupWallsHorizontally', false);
        /** @type {boolean} */
        this.allowSimultaneous = sc.get(options, 'allowSimultaneous', false);
        /** @type {boolean} */
        this.allowChangePoints = sc.get(options, 'allowChangePoints', true);
        /** @type {boolean} */
        this.allowRoomObjectsCreation = sc.get(options, 'allowRoomObjectsCreation', true);
        /** @type {boolean} */
        this.allowBodiesWithState = sc.get(options, 'allowBodiesWithState', true);
        /** @type {boolean} */
        this.usePathFinder = sc.get(options, 'usePathFinder', true);
        /** @type {boolean} */
        this.respawnAreas = false;
        /** @type {Array<Object>} */
        this.removeBodies = [];
        /** @type {Array<string>} */
        this.removeBulletsStateIds = [];
        /** @type {string} */
        this.type = sc.get(options, 'type', WorldConst.WORLD_TYPES.NO_GRAVITY_2D);
        /** @type {number} */
        this.totalBodiesCount = 0;
        /** @type {number} */
        this.totalBodiesCreated = 0;
        /** @type {Array<Object>} */
        this.queueBodies = [];
        /** @type {PathFinder|boolean} */
        this.pathFinder = false;
        this.enablePathFinder();
        /** @type {Date} */
        this.worldDateTime = null;
        /** @type {number} */
        this.worldDateTimeInterval = null;
        this.enableWorldDateTime();
        /** @type {string} */
        this.worldKey = sc.randomChars(16);
        /** @type {number} */
        this.limitsBodyType = sc.get(options.worldConfig, 'limitsBodyType', Body.STATIC);
        /** @type {number} */
        this.wallBodyType = sc.get(options.worldConfig, 'wallBodyType', Body.STATIC);
        /** @type {number} */
        this.changePointsBodyType = sc.get(options.worldConfig, 'changePointsBodyType', Body.STATIC);
        /** @type {number} */
        this.worldObjectBodyType = sc.get(options.worldConfig, 'worldObjectBodyType', Body.DYNAMIC);
        /** @type {number} */
        this.playersBodyType = sc.get(options.worldConfig, 'playersBodyType', Body.DYNAMIC);
        /** @type {number} */
        this.bulletsBodyType = sc.get(options.worldConfig, 'playersBodyType', Body.DYNAMIC);
        /** @type {Object} */
        this.bodyTypes = {
            KINEMATIC: Body.KINEMATIC,
            STATIC: Body.STATIC,
            DYNAMIC: Body.DYNAMIC
        };
        /** @type {TypeDeterminer} */
        this.typeDeterminer = new TypeDeterminer();
        /** @type {boolean} */
        this.playerAnimationBasedOnPress = this.config.get('client/players/animations/basedOnPress', false);
        /** @type {boolean} */
        this.playerAnimationDiagonalHorizontal = this.config.get('client/players/animations/diagonalHorizontal', false);
        /** @type {boolean} */
        this.usePlayerSpeedConfig = this.config.get('server/players/physicsBody/usePlayerSpeedConfig', false);
        /** @type {Object<number, Object>} */
        this.createdChangePoints = {};
        /** @type {Object<number, string>} */
        this.changePoints = {};
        /** @type {number} */
        this.playerMovementSpeed = 0;
    }

    /**
     * @param {Object} options
     * @returns {void}
     */
    saveMapData(options)
    {
        this.mapJson = sc.get(options, 'mapJson');
        if(!this.mapJson && sc.hasOwn(this.config, 'server') && sc.hasOwn(this.config.server, 'maps')){
            this.mapJson = sc.get(this.config.server.maps, this.sceneTiledMapFile, false);
        }
        if(!this.mapJson){
            Logger.critical(
                'Map "'+this.sceneTiledMapFile+'" not found in server maps.',
                Object.keys(this.config.server.maps)
            );
            ErrorManager.error('Map "'+this.sceneTiledMapFile+'" not found in server maps.');
        }
    }

    enableWorldDateTime()
    {
        this.worldDateTime = new Date();
        this.worldDateTimeInterval = setInterval(() => {
            this.worldDateTime = new Date();
            // Logger.debug('World '+this.worldKey+': '+this.worldDateTime.toISOString().slice(0, 19).replace('T', ' '));
        }, 1000);
    }

    enablePathFinder()
    {
        if(!this.usePathFinder){
            return;
        }
        this.pathFinder = new PathFinder();
        this.pathFinder.world = this;
        this.pathFinder.createGridFromMap();
    }

    /**
     * @param {Object} options
     * @returns {void}
     */
    validateRequiredProperties(options)
    {
        if(!this.events){
            ErrorManager.error('EventsManager undefined in P2world.');
        }
        if(!this.roomId || !this.sceneName || !this.sceneTiledMapFile){
            Logger.critical('World creation missing data in options.', {
                roomId: this.roomId,
                sceneName: this.sceneName,
                sceneTiledMapFile: this.sceneTiledMapFile
            });
            ErrorManager.error('World creation missing data in options.');
        }
        if(!this.config){
            ErrorManager.error('Missing Config Manager.');
        }
    }

    /**
     * @param {Object} mapData
     * @returns {Promise<void>}
     */
    async createWorldContent(mapData)
    {
        // @TODO - BETA - Analyze and implement blocks groups, for example, all simple collision blocks could be
        //   grouped and use a single big block to avoid the overload number of small blocks which now impacts in the
        //   consumed resources.
        if(!this.validateMapData(this.mapJson)){
            Logger.error('Missing map data.', this.mapJson);
            return;
        }
        if(!this.shouldGroupBodies()){
            Logger.warning('Group bodies fully disabled, this can impact performance.');
        }
        this.changePoints = this.getSceneChangePoints(mapData);
        let mapLayers = this.mapJson.layers;
        let createObjectsData = [];
        for(let layer of mapLayers){
            let eventData = {layer, world: this};
            await this.events.emit('reldens.parsingMapLayerBefore', eventData);
            createObjectsData.push(...await this.createLayerContents(eventData.layer));
            await this.events.emit('reldens.parsingMapLayerAfter', eventData);
        }
        for(let objectData of createObjectsData){
            let {layer, tileIndex, tileW, tileH, posX, posY} = objectData;
            await this.createRoomObjectBody(layer, tileIndex, tileW, tileH, posX, posY);
        }
        this.processBodiesQueue();
        for(let layer of mapLayers) {
            let eventData = {layer, world: this};
            await this.events.emit('reldens.parsingMapLayersAfterBodiesQueue', eventData);
        }
        Logger.info(
            'Total wall bodies found: '+this.totalBodiesCount,
            'Total wall bodies created: '+this.totalBodiesCreated
        );
    }

    processBodiesQueue()
    {
        this.queueBodies.sort((a, b) => {
            const lowestIndexA = a.tileIndexes[0];
            const lowestIndexB = b.tileIndexes[0];
            return lowestIndexA - lowestIndexB;
        });
        for(let bodyWall of this.queueBodies){
            this.addBody(bodyWall);
        }
        this.queueBodies = [];
    }

    /**
     * @param {Object} layer
     * @returns {Promise<Array<Object>>}
     */
    async createLayerContents(layer)
    {
        let tileW = this.mapJson.tilewidth,
            tileH = this.mapJson.tileheight,
            halfTileW = tileW / 2,
            halfTileH = tileH / 2;
        let isChangePointsLayer = -1 !== layer.name.indexOf('change-points');
        let isCollisionsLayer = -1 !== layer.name.indexOf('collisions');
        let createObjectsData = [];
        // loop columns:
        for(let c = 0; c < this.mapJson.width; c++){
            let posX = c * tileW + halfTileW;
            // loop rows:
            for(let r = 0; r < this.mapJson.height; r++){
                // position in units:
                let posY = r * tileH + halfTileH;
                let tileIndex = this.tileIndexByRowAndColumn(r, c);
                let tile = layer.data[tileIndex];
                let isZeroTile = 0 === Number(tile);
                let isChangePoint = false;
                let isCollisionBody = false;
                // the 0 value is for empty tiles without collisions or change points:
                if(!isZeroTile){
                    // look for change points on the layers with the proper name convention:
                    if(this.allowChangePoints && isChangePointsLayer){
                        isChangePoint = this.createChangePoint(tileIndex, tileW, tileH, posX, posY);
                        this.createdChangePoints[tileIndex] = isChangePoint;
                    }
                    // create collisions for layers with the proper name convention:
                    if(isCollisionsLayer){
                        isCollisionBody = this.createWallCollisionBody(
                            tileIndex,
                            this.determinePreviousTileIndexFromGroupingType(tileIndex, layer, r, c),
                            tileW,
                            tileH,
                            posX,
                            posY
                        );
                    }
                }
                if(this.usePathFinder){
                    this.markPathFinderTile(layer, isZeroTile, isChangePoint, isCollisionBody, c, r);
                }
                // @TODO - BETA - Emit event and move the rooms objects creation into the objects plugin.
                createObjectsData.push({layer, tileIndex, tileW, tileH, posX, posY});
            }
        }
        if(isChangePointsLayer){
            this.createChangePointsFromStorage();
        }
        return createObjectsData;
    }

    createChangePointsFromStorage()
    {
        let roomChangePointsTileIndex = Object.keys(this.changePoints);
        for(let tileIndex of roomChangePointsTileIndex){
            let changePoint = this.changePoints[tileIndex];
            if(this.createdChangePoints[tileIndex]){
                Logger.debug('Change point already created on map.', tileIndex, changePoint);
                continue;
            }
            Logger.warning('Change point saved in the storage was does not exists in the map.', changePoint);
            let {col, row} = this.fetchPositionFromTileIndex(tileIndex);
            if(!this.pathFinder.grid.isWalkableAt(col, row)){
                Logger.error('Missing change point on map cannot be created because node is not walkable.', {
                    changePoint,
                    tileIndex,
                    col,
                    row
                });
                continue;
            }
            this.pathFinder.grid.setWalkableAt(col, row, false);
            this.createdChangePoints[tileIndex] = this.createChangePoint(
                tileIndex,
                this.mapJson.tilewidth,
                this.mapJson.tileheight,
                col * this.mapJson.tilewidth,
                row * this.mapJson.tileheight
            );
            Logger.info('Created missing change point in map.', changePoint, tileIndex, col, row);
        }
    }

    /**
     * @param {number} tileIndex
     * @param {Object} layer
     * @param {number} r
     * @param {number} c
     * @returns {number|boolean}
     */
    determinePreviousTileIndexFromGroupingType(tileIndex, layer, r, c)
    {
        if(!this.shouldGroupBodies()){
            return false;
        }
        if(this.groupWallsVertically){
            return this.fetchPreviousWallTile(layer, r, c);
        }
        return 0 === tileIndex ? false : tileIndex - 1;
    }

    /**
     * @param {Object} layer
     * @param {number} r
     * @param {number} c
     * @returns {number|boolean}
     */
    fetchPreviousWallTile(layer, r, c)
    {
        if(0 === r){
            return false;
        }
        let tileIndex = this.tileIndexByRowAndColumn(r - 1, c);
        let tile = layer.data[tileIndex];
        let isZeroTile = 0 === Number(tile);
        return isZeroTile ? false : tileIndex;
    }

    /**
     * @param {number} r
     * @param {number} c
     * @returns {number}
     */
    tileIndexByRowAndColumn(r, c)
    {
        return r * this.mapJson.width + c;
    }

    /**
     * @param {number} tileIndex
     * @returns {Object}
     */
    fetchPositionFromTileIndex(tileIndex)
    {
        let row = Math.floor(tileIndex / this.mapJson.width);
        let col = tileIndex % this.mapJson.width;
        return { col, row };
    }

    /**
     * @param {Object} mapJson
     * @returns {boolean}
     */
    validateMapData(mapJson)
    {
        return 0 < Number(mapJson.width || 0)
            && 0 < Number(mapJson.height || 0)
            && 0 < Number(mapJson.tilewidth || 0)
            && 0 < Number(mapJson.tileheight || 0);
    }

    /**
     * @param {Object} layer
     * @param {number} tileIndex
     * @param {number} tileW
     * @param {number} tileH
     * @param {number} posX
     * @param {number} posY
     * @returns {Promise<Object|void>}
     */
    async createRoomObjectBody(layer, tileIndex, tileW, tileH, posX, posY)
    {
        if(!this.allowRoomObjectsCreation || !this.objectsManager){
            return;
        }
        // objects will be found by layer name + tile index:
        let objectIndex = layer.name + tileIndex;
        // this will validate if the object class exists and return an instance of it:
        let roomObject = this.objectsManager.getObjectData(objectIndex);
        // if the data and the instance was created:
        if(!roomObject){
            return;
        }
        if(roomObject.multiple){
            return;
        }
        return await this.createWorldObject(roomObject, objectIndex, tileW, tileH, posX, posY);
    }

    /**
     * @param {Object} layer
     * @param {boolean} isZeroTile
     * @param {boolean|Object} isChangePoint
     * @param {boolean|Object} isCollisionBody
     * @param {number} c
     * @param {number} r
     * @returns {void}
     */
    markPathFinderTile(layer, isZeroTile, isChangePoint, isCollisionBody, c, r)
    {
        if(!this.pathFinder){
            return;
        }
        let isPathFinderLayer = -1 !== layer.name.indexOf('pathfinder');
        let hasBody = !isZeroTile && (isChangePoint || isCollisionBody);
        let isNotPathFinderTile = isZeroTile && isPathFinderLayer;
        if(!hasBody && !isNotPathFinderTile){
            return;
        }
        this.pathFinder.grid.setWalkableAt(c, r, false);
    }

    /**
     * @param {number} tileIndex
     * @param {number|boolean} previousWallTileIndex
     * @param {number} tileW
     * @param {number} tileH
     * @param {number} posX
     * @param {number} posY
     * @returns {Object}
     */
    createWallCollisionBody(tileIndex, previousWallTileIndex, tileW, tileH, posX, posY)
    {
        this.totalBodiesCount++;
        let existentTileBodyWall = false !== previousWallTileIndex
            ? this.fetchBodyByTileIndexId(previousWallTileIndex)
            : false;
        if(existentTileBodyWall){
            let currentIndexes = existentTileBodyWall.tileIndexes;
            if(-1 !== currentIndexes.indexOf(tileIndex)){
                return existentTileBodyWall;
            }
            currentIndexes.push(tileIndex);
            let bodyWall = this.createWall(
                this.determineShapeWidth(currentIndexes, tileW),
                this.determineShapeHeight(currentIndexes, tileH),
                this.determineBodyPositionX(existentTileBodyWall, tileW, posX),
                this.determineBodyPositionY(existentTileBodyWall, tileH, posY),
                this.wallBodyType
            );
            bodyWall.tileIndexes = currentIndexes;
            bodyWall.firstTileIndex = existentTileBodyWall.firstTileIndex;
            this.queueBodies.splice(this.queueBodies.indexOf(existentTileBodyWall), 1);
            this.queueBodies.push(bodyWall);
            return bodyWall;
        }
        let bodyWall = this.createWall(tileW, tileH, posX, posY, this.wallBodyType);
        bodyWall.tileIndexes = [tileIndex];
        bodyWall.firstTileIndex = tileIndex;
        !this.shouldGroupBodies() ? this.addBody(bodyWall) : this.queueBodies.push(bodyWall);
        this.totalBodiesCreated++;
        return bodyWall;
    }

    /**
     * @returns {boolean}
     */
    shouldGroupBodies()
    {
        return this.groupWallsVertically || this.groupWallsHorizontally;
    }

    /**
     * @param {Object} existentTileBodyWall
     * @param {number} tileH
     * @param {number} posY
     * @returns {number}
     */
    determineBodyPositionY(existentTileBodyWall, tileH, posY)
    {
        if(!this.groupWallsVertically){
            return posY;
        }
        return existentTileBodyWall.position[1] + (tileH / 2);
    }

    /**
     * @param {Object} existentTileBodyWall
     * @param {number} tileW
     * @param {number} posX
     * @returns {number}
     */
    determineBodyPositionX(existentTileBodyWall, tileW, posX)
    {
        if(!this.groupWallsHorizontally){
            return posX;
        }
        return existentTileBodyWall.position[0] + (tileW / 2);
    }

    /**
     * @param {Array<number>} currentIndexes
     * @param {number} tileH
     * @returns {number}
     */
    determineShapeHeight(currentIndexes, tileH)
    {
        if(!this.groupWallsVertically){
            return tileH;
        }
        return currentIndexes.length * tileH;
    }

    /**
     * @param {Array<number>} currentIndexes
     * @param {number} tileW
     * @returns {number}
     */
    determineShapeWidth(currentIndexes, tileW)
    {
        if(!this.groupWallsHorizontally){
            return tileW;
        }
        return currentIndexes.length * tileW;
    }

    /**
     * @param {number} tileIndex
     * @returns {Object|boolean}
     */
    fetchBodyByTileIndexId(tileIndex)
    {
        for(let body of this.queueBodies){
            if(!body.isWall || !body.tileIndexes){
                continue;
            }
            if(-1 !== body.tileIndexes.indexOf(tileIndex)){
                return body;
            }
        }
        return false;
    }

    /**
     * @param {number} tileIndex
     * @param {number} tileW
     * @param {number} tileH
     * @param {number} posX
     * @param {number} posY
     * @returns {Object|boolean}
     */
    createChangePoint(tileIndex, tileW, tileH, posX, posY)
    {
        let changeScenePoint = sc.get(this.changePoints, tileIndex, null);
        if(null === changeScenePoint){
            Logger.error('Change point data not found in this.changePoints for tileIndex:', tileIndex);
            return false;
        }
        // @NOTE: we make the change point smaller so the user needs to walk into to hit it.
        let bodyChangePoint = this.createCollisionBody((tileW/2), (tileH/2), posX, posY, this.changePointsBodyType);
        bodyChangePoint.changeScenePoint = changeScenePoint;
        this.addBody(bodyChangePoint);
        Logger.info('Created change point on tileIndex: ' + tileIndex, posX, posY);
        return bodyChangePoint;
    }

    /**
     * @param {Object} roomObject
     * @param {string} objectIndex
     * @param {number} tileW
     * @param {number} tileH
     * @param {number} posX
     * @param {number} posY
     * @param {Object|boolean} [pathFinder]
     * @returns {Promise<Object>}
     */
    async createWorldObject(roomObject, objectIndex, tileW, tileH, posX, posY, pathFinder = false)
    {
        // handle body fixed position:
        posX += sc.get(roomObject, 'xFix', 0);
        posY += sc.get(roomObject, 'yFix', 0);
        roomObject.x = posX;
        roomObject.y = posY;
        // save position in room object:
        if(this.objectsManager && sc.hasOwn(this.objectsManager.objectsAnimationsData, objectIndex)){
            this.objectsManager.objectsAnimationsData[objectIndex].x = posX;
            this.objectsManager.objectsAnimationsData[objectIndex].y = posY;
        }
        // check and calculate interaction area:
        if(roomObject.interactionArea){
            roomObject.setupInteractionArea();
        }
        // by default objects won't have mass:
        let bodyMass = sc.get(roomObject, 'bodyMass', 1);
        let collision = sc.get(roomObject, 'collisionResponse', true);
        let hasState = this.allowBodiesWithState ? sc.get(roomObject, 'hasState', false) : false;
        let collisionType = sc.get(roomObject, 'collisionType', this.worldObjectBodyType);
        let collisionGroup = sc.get(roomObject, 'collisionGroup', WorldConst.COLLISIONS.OBJECT);
        // @TODO - BETA - Replace the tileW and tileH by the actual object size which should be saved in the storage.
        let bodyObject = this.createCollisionBody(
            tileW,
            tileH,
            posX,
            posY,
            collisionType,
            collisionGroup,
            bodyMass,
            collision,
            hasState,
            objectIndex
        );
        bodyObject.disableObjectsCollisionsOnChase = this.disableObjectsCollisionsOnChase;
        bodyObject.disableObjectsCollisionsOnReturn = this.disableObjectsCollisionsOnReturn;
        bodyObject.isRoomObject = true;
        // assign the room object to the body:
        bodyObject.roomObject = roomObject;
        if(this.usePathFinder && pathFinder){
            bodyObject.pathFinder = pathFinder;
        }
        // try to get object instance from project root:
        this.addBody(bodyObject);
        // set data on room object:
        roomObject.state = bodyObject.bodyState;
        roomObject.objectBody = bodyObject;
        Logger.info('Created object for objectIndex: '+objectIndex+' - At x/y: '+posX+' / '+posY+'.');
        await this.events.emit('reldens.createdWorldObject', {
            p2world: this,
            roomObject,
            bodyObject,
            bodyMass,
            collision,
            hasState,
            objectIndex,
            tileW,
            tileH,
            posX,
            posY,
            pathFinder
        });
        return roomObject;
    }

    createLimits()
    {
        // map data:
        let blockW = this.mapJson.tilewidth,
            blockH = this.mapJson.tileheight,
            mapW = this.mapJson.width * blockW,
            mapH = this.mapJson.height * blockH,
            worldLimit = 1,
            fullW = mapW + blockW,
            fullH = mapH + blockH;
        // create world boundary, up wall:
        let upWall = this.createWall(fullW, worldLimit, (mapW/2), 1, this.limitsBodyType);
        upWall.isWorldWall = true;
        this.addBody(upWall);
        // create world boundary, down wall:
        let downWall = this.createWall(fullW, worldLimit, (mapW/2), (mapH-worldLimit), this.limitsBodyType);
        downWall.isWorldWall = true;
        this.addBody(downWall);
        // create world boundary, left wall:
        let leftWall = this.createWall(worldLimit, fullH, 1, (mapH/2), this.limitsBodyType);
        leftWall.isWorldWall = true;
        this.addBody(leftWall);
        // create world boundary, right wall:
        let rightWall = this.createWall(worldLimit, fullH, (mapW-worldLimit), (mapH/2), this.limitsBodyType);
        rightWall.isWorldWall = true;
        this.addBody(rightWall);
    }

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} x
     * @param {number} y
     * @param {number} bodyType
     * @returns {Object}
     */
    createWall(width, height, x, y, bodyType)
    {
        let wallBody = this.createCollisionBody(
            width,
            height,
            x,
            y,
            bodyType,
            WorldConst.COLLISIONS.WALL,
            this.wallsMassValue
        );
        wallBody.isWall = true;
        return wallBody;
    }

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} x
     * @param {number} y
     * @param {number} type
     * @param {number} [collisionGroup]
     * @param {number} [mass]
     * @param {boolean} [collisionResponse]
     * @param {boolean} [bodyState]
     * @param {string|boolean} [bodyKey]
     * @param {string|boolean} [dir]
     * @returns {Object}
     */
    createCollisionBody(
        width,
        height,
        x,
        y,
        type,
        collisionGroup = WorldConst.COLLISIONS.WALL,
        mass = 1,
        collisionResponse = true,
        bodyState = false,
        bodyKey = false,
        dir = false
    ){
        let boxShape = this.createCollisionShape(width, height, collisionGroup, collisionResponse);
        let bodyConfig = {
            mass: mass,
            position: [x, y],
            type,
            fixedRotation: true,
            movementSpeed: this.movementSpeed,
            jumpSpeed: this.jumpSpeed,
            jumpTimeMs: this.jumpTimeMs
        };
        let bodyClass = bodyState ? PhysicalBody : Body;
        let boxBody = new bodyClass(bodyConfig);
        if(bodyState){
            boxBody.bodyState = this.createBodyState(bodyState, x, y, dir, boxBody, bodyKey);
        }
        boxBody.originalCollisionGroup = collisionGroup;
        boxBody.addShape(boxShape);
        return boxBody;
    }

    /**
     * @param {boolean|Object} bodyState
     * @param {number} x
     * @param {number} y
     * @param {string|boolean} dir
     * @param {Object} boxBody
     * @param {string|boolean} bodyKey
     * @returns {Object}
     */
    createBodyState(bodyState, x, y, dir, boxBody, bodyKey)
    {
        if(bodyState instanceof PhysicalBody){
            return bodyState;
        }
        return new ObjectBodyState({
            x: x,
            y: y,
            dir: dir || GameConst.DOWN,
            scene: this.sceneName,
            id: boxBody.id,
            key: bodyKey || '',
            room_id: this.roomId
        });
    }

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} collisionGroup
     * @param {boolean} [collisionResponse]
     * @param {number} [x]
     * @param {number} [y]
     * @returns {Object}
     */
    createCollisionShape(width, height, collisionGroup, collisionResponse = true, x = 0, y = 0)
    {
        // @TODO - BETA - Make collision groups configurable to be able to include more values.
        let boxShape = new Box({width, height, position: [x, y]});
        boxShape.collisionGroup = collisionGroup;
        boxShape.collisionMask = this.collisionsGroupsByType[collisionGroup];
        // Logger.debug('Setting collision mask "'+boxShape.collisionMask+'" for group "'+boxShape.collisionGroup+'".');
        boxShape.collisionResponse = collisionResponse;
        return boxShape;
    }

    /**
     * @param {Object} mapData
     * @returns {Object}
     */
    getSceneChangePoints(mapData)
    {
        if(!mapData.changePoints){
            return {};
        }
        let changePointsKeys = Object.keys(mapData.changePoints);
        if(0 === changePointsKeys.length){
            return {};
        }
        let changePoints = {};
        for(let i of changePointsKeys){
            let changePoint = mapData.changePoints[i];
            changePoints[changePoint[RoomsConst.TILE_INDEX]] = changePoint[RoomsConst.NEXT_SCENE];
        }
        return changePoints;
    }

    /**
     * @param {Object} playerData
     * @returns {Object}
     */
    createPlayerBody(playerData)
    {
        // @TODO - BETA - Players collision will be configurable, for now when collisions are active players can
        //   push players.
        let boxShape = this.createCollisionShape(playerData.width, playerData.height, WorldConst.COLLISIONS.PLAYER);
        this.playerMovementSpeed = this.fetchPlayerSpeed(playerData.speed);
        let boxBody = new PhysicalBody({
            mass: this.playerMassValue,
            position: [playerData.bodyState.x, playerData.bodyState.y],
            type: this.playersBodyType,
            fixedRotation: true,
            animationBasedOnPress: this.playerAnimationBasedOnPress,
            diagonalHorizontal: this.playerAnimationDiagonalHorizontal,
            movementSpeed: this.playerMovementSpeed
        });
        boxBody.playerId = playerData.id;
        boxBody.collideWorldBounds = true;
        boxBody.isChangingScene = false;
        boxBody.isBlocked = false;
        boxBody.originalCollisionGroup = WorldConst.COLLISIONS.PLAYER;
        boxBody.addShape(boxShape);
        if(this.allowBodiesWithState){
            boxBody.bodyState = playerData.bodyState;
        }
        this.addBody(boxBody);
        return boxBody;
    }

    /**
     * @param {number} playerSpeed
     * @returns {number}
     */
    fetchPlayerSpeed(playerSpeed)
    {
        let movementSpeed = this.movementSpeed;
        if(this.usePlayerSpeedConfig){
            let configSpeed = this.config.get('server/players/physicsBody/speed', playerSpeed);
            if(0 < configSpeed){
                movementSpeed = configSpeed;
            }
        }
        Logger.debug('Use movement speed: '+movementSpeed);
        return movementSpeed;
    }

    /**
     * @param {Object} fromPosition
     * @param {Object} toPosition
     * @param {Object} bulletObject
     * @returns {Object}
     */
    shootBullet(fromPosition, toPosition, bulletObject)
    {
        let { objectWidth, objectHeight } = bulletObject;
        let wTH = (this.mapJson.tileheight / 2) + (objectHeight / 2);
        let wTW = (this.mapJson.tilewidth / 2) + (objectWidth / 2);
        let bulletY = fromPosition.y + ((toPosition.y > fromPosition.y) ? wTH : -wTH);
        let bulletX = fromPosition.x + ((toPosition.x > fromPosition.x) ? wTW : -wTW);
        let y = toPosition.y - bulletY;
        let x = toPosition.x - bulletX;
        let angleByVelocity = Math.atan2(y, x);
        let bulletAngle = angleByVelocity * 180 / Math.PI;
        let bulletKey = bulletObject.key ? bulletObject.key : '';
        let speedX = bulletObject.magnitude * Math.cos(angleByVelocity);
        let speedY = bulletObject.magnitude * Math.sin(angleByVelocity);
        let direction = this.calculateDirection(bulletObject, fromPosition, toPosition);
        Logger.debug(
            'Shooting bullet "'+bulletKey+'":',
            {objectWidth, objectHeight, bulletY, bulletX, fromPosition, toPosition, bulletAngle, speedX, speedY},
        );
        let collisionKey = 'BULLET_'+this.determineFromType(bulletObject);
        let bulletBody = this.createCollisionBody(
            objectWidth,
            objectHeight,
            bulletX,
            bulletY,
            this.bulletsBodyType,
            WorldConst.COLLISIONS[collisionKey],
            1,
            true,
            true,
            bulletKey,
            direction
        );
        bulletBody.updateMassProperties();
        bulletBody.roomObject = bulletObject;
        bulletBody.hitPriority = bulletObject.hitPriority ? bulletObject.hitPriority : 2;
        bulletBody.isRoomObject = true;
        bulletBody.isBullet = true;
        bulletBody.key = '' === bulletKey ? 'bullet-'+bulletBody.id : bulletKey;
        // append body to world:
        this.addBody(bulletBody);
        // @NOTE: this index here will be the animation key since the bullet state doesn't have a key property.
        let bodyStateId = bulletKey+'_bullet_'+bulletBody.id;
        bulletBody.bodyStateId = bodyStateId;
        // and state on room map schema:
        bulletObject.room.state.addBodyToState(bulletBody.bodyState, bodyStateId);
        bulletBody.angle = bulletAngle;
        bulletBody.originalSpeed = {x: speedX, y: speedY};
        bulletBody.velocity[0] = speedX;
        bulletBody.velocity[1] = speedY;
        // since the enemy won't be hit until the bullet reach the target we need to return false to avoid the onHit
        // automatic actions (for example pve init).
        return bulletBody;
    }

    /**
     * @param {Object} bulletObject
     * @returns {string}
     */
    determineFromType(bulletObject)
    {
        if(this.typeDeterminer.isPlayer(bulletObject.owner)){
            return WorldConst.FROM_TYPES.PLAYER;
        }
        if(this.typeDeterminer.isObject(bulletObject.owner)){
            return WorldConst.FROM_TYPES.OBJECT;
        }
        return WorldConst.FROM_TYPES.OTHER;
    }

    /**
     * @param {Object} bulletObject
     * @param {Object} fromPosition
     * @param {Object} toPosition
     * @returns {string}
     */
    calculateDirection(bulletObject, fromPosition, toPosition)
    {
        let animDir = sc.get(bulletObject, 'animDir', false);
        if(3 === animDir){
            return fromPosition.x < toPosition.x ? GameConst.RIGHT : GameConst.LEFT;
        }
        return fromPosition.y < toPosition.y ? GameConst.DOWN : GameConst.UP;
    }

    removeBodiesFromWorld()
    {
        if(0 === this.removeBodies.length){
            return;
        }
        for(let removeBody of this.removeBodies){
            this.removeBody(removeBody);
        }
        // reset the array after remove all bodies:
        this.removeBodies = [];
    }

}

module.exports.P2world = P2world;
