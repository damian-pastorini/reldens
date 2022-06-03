/**
 *
 * Reldens - P2worldGravity
 *
 */

const { World, Body, Box } = require('p2');
const { PhysicalBody } = require('./physical-body');
const { ObjectBodyState } = require('./object-body-state');
const { GameConst } = require('../../game/constants');
const { RoomsConst } = require('../../rooms/constants');
const { WorldConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class P2worldGravity extends World
{

    // @TODO - BETA - This class is almost an entire copy of P2world class, both will be replaced by the physics driver.
    constructor(options)
    {
        super(options);
        this.events = sc.get(options, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in P2world.');
        }
        this.roomId = options.roomId || false;
        this.sceneName = options.sceneName || false;
        this.sceneTiledMapFile = options.roomMap || false;
        if(!this.roomId || !this.sceneName || !this.sceneTiledMapFile){
            ErrorManager.error(['World creation missing data in options:', options]);
        }
        // assign config parameters as world properties:
        this.applyGravity = sc.get(options.worldConfig, 'applyGravity', false);
        this.gravity = sc.get(options.worldConfig, 'gravity', [0, 0]);
        this.globalStiffness = sc.get(options.worldConfig, 'globalStiffness', 100000000);
        this.globalRelaxation = sc.get(options.worldConfig, 'globalRelaxation', 10);
        this.useFixedWorldStep = sc.get(options.worldConfig, 'useFixedWorldStep', false);
        this.timeStep = sc.get(options.worldConfig, 'timeStep', 0.012);
        this.maxSubSteps = sc.get(options.worldConfig, 'maxSubSteps', 5);
        this.movementSpeed = sc.get(options.worldConfig, 'movementSpeed', 200);
        this.allowPassWallsFromBelow = sc.get(options.worldConfig, 'allowPassWallsFromBelow', false);
        this.jumpSpeed = sc.get(options.worldConfig, 'jumpSpeed', 0);
        this.jumpTimeMs = sc.get(options.worldConfig, 'jumpTimeMs', 0);
        this.tryClosestPath = sc.get(options.worldConfig, 'tryClosestPath', false);
        this.onlyWalkable = sc.get(options.worldConfig, 'onlyWalkable', false);
        this.wallsMassValue = sc.get(options.worldConfig, 'wallsMassValue', 1);
        this.playerMassValue = sc.get(options.worldConfig, 'playerMassValue', 1);
        this.bulletsStopOnPlayer = sc.get(options.worldConfig, 'bulletsStopOnPlayer', true);
        // keys events:
        this.allowSimultaneous = options.allowSimultaneous;
        // objects:
        this.objectsManager = options.objectsManager;
        if(!this.objectsManager.config.server.maps[this.sceneTiledMapFile]){
            ErrorManager.error([
                'Map not found:', this.sceneTiledMapFile,
                'In:', this.objectsManager.config.server.maps
            ]);
        }
        this.mapJson = this.objectsManager.config.server.maps[this.sceneTiledMapFile];
        this.respawnAreas = false;
        this.removeBodies = [];
        this.type = WorldConst.TYPES.TOP_DOWN_WITH_GRAVITY;
    }

    async createWorldContent(mapData)
    {
        // @TODO - BETA - Analyze and implement blocks groups, for example, all simple collision blocks could be
        //   grouped and use a single big block to avoid the overload number of small blocks which now impacts in the
        //   consumed resources.
        // get scene change points:
        this.changePoints = this.getSceneChangePoints(mapData);
        // map data:
        let mapLayers = this.mapJson.layers,
            mapW = this.mapJson.width,
            mapH = this.mapJson.height,
            tileW = this.mapJson.tilewidth,
            tileH = this.mapJson.tileheight;
        // loop layers:
        for(let layer of mapLayers){
            let layerData = layer.data;
            await this.events.emit('reldens.parsingMapLayerBefore', layer, this);
            // loop columns:
            for(let c = 0; c < mapW; c++){
                let posX = c * tileW + (tileW/2);
                // loop rows:
                for(let r = 0; r < mapH; r++){
                    // position in pixels:
                    let posY = r * tileH + (tileH/2);
                    let tileIndex = r * mapW + c;
                    let tile = layerData[tileIndex];
                    let isZeroTile = 0 === Number(tile);
                    // the 0 value are empty tiles without collisions or change points:
                    let isChangePoint = -1 !== layer.name.indexOf('change-points');
                    let isCollisionBody = -1 !== layer.name.indexOf('collisions');
                    if(!isZeroTile && (isChangePoint || isCollisionBody)){
                        this.createCollision(layer.name, tileIndex, tileW, tileH, posX, posY);
                    }
                    // objects will be found by layer name + tile index:
                    let objectIndex = layer.name + tileIndex;
                    // this will validate if the object class exists and return an instance of it:
                    let roomObject = this.objectsManager.getObjectData(objectIndex);
                    // if the data and the instance was created:
                    if(roomObject && !roomObject.multiple){
                        await this.createWorldObject(roomObject, objectIndex, tileW, tileH, posX, posY);
                    }
                }
            }
            await this.events.emit('reldens.parsingMapLayerAfter', layer, this);
        }
    }

    /**
     * @internal
     */
    createCollision(layerName, tileIndex, tileW, tileH, posX, posY)
    {
        // look for change points on the layers with the proper name convention:
        let isChangePoint = -1 !== layerName.indexOf('change-points');
        if(isChangePoint){
            let changeScenePoint = sc.get(this.changePoints, tileIndex, null);
            if(null === changeScenePoint){
                Logger.error(['Change point data not found in this.changePoints for tileIndex:', tileIndex]);
                return false;
            }
            // @NOTE: we make the change point smaller so the user needs to walk into to hit it, also add it with mass.
            let bodyChangePoint = this.createCollisionBody((tileW/2), (tileH/2), posX, posY, this.wallsMassValue);
            bodyChangePoint.changeScenePoint = changeScenePoint;
            this.addBody(bodyChangePoint);
            Logger.info('Created change point on tileIndex: ' + tileIndex);
        }
        // create collisions for layers with the proper name convention:
        let isCollisionBody = -1 !== layerName.indexOf('collisions');
        if(isCollisionBody){
            // create a box to fill the space:
            let bodyWall = this.createCollisionBody(tileW, tileH, posX, posY, this.wallsMassValue);
            bodyWall.isWall = true;
            this.addBody(bodyWall);
        }
    }

    async createWorldObject(roomObject, objectIndex, tileW, tileH, posX, posY)
    {
        // handle body fixed position:
        if(sc.hasOwn(roomObject, 'xFix')){
            posX += roomObject.xFix;
        }
        if(sc.hasOwn(roomObject, 'yFix')){
            posY += roomObject.yFix;
        }
        roomObject.x = posX;
        roomObject.y = posY;
        // save position in room object:
        if(sc.hasOwn(this.objectsManager.objectsAnimationsData, objectIndex)){
            this.objectsManager.objectsAnimationsData[objectIndex].x = posX;
            this.objectsManager.objectsAnimationsData[objectIndex].y = posY;
        }
        // check and calculate interaction area:
        if(roomObject.interactionArea){
            roomObject.setupInteractionArea();
        }
        // by default objects won't have mass:
        let bodyMass = sc.get(roomObject, 'bodyMass', 0);
        // by default objects collision response:
        let colResponse = sc.hasOwn(roomObject, 'collisionResponse', false);
        // object state:
        let objHasState = sc.get(roomObject, 'hasState', false);
        // create the body:
        let bodyObject = this.createCollisionBody(
            tileW,
            tileH,
            posX,
            posY,
            bodyMass,
            colResponse,
            objHasState,
            objectIndex
        );
        bodyObject.isRoomObject = true;
        // assign the room object to the body:
        bodyObject.roomObject = roomObject;
        Logger.info('Created object for objectIndex: ' + objectIndex);
        // try to get object instance from project root:
        this.addBody(bodyObject);
        // set data on room object:
        roomObject.state = bodyObject.bodyState;
        roomObject.objectBody = bodyObject;
        await this.events.emit('reldens.createdWorldObject', {
            p2world: this,
            roomObject,
            bodyObject,
            bodyMass,
            colResponse,
            objHasState,
            objectIndex,
            tileW,
            tileH,
            posX,
            posY
        });
    }

    createLimits()
    {
        // map data:
        let blockW = this.mapJson.tilewidth,
            blockH = this.mapJson.tileheight,
            mapW = this.mapJson.width * blockW,
            mapH = this.mapJson.height * blockH,
            worldLimit = 1;
        // create world boundary, up wall:
        let upWall = this.createCollisionBody((mapW+blockW), worldLimit, (mapW/2), 1, this.wallsMassValue);
        upWall.isWorldWall = true;
        upWall.isWall = true;
        this.addBody(upWall);
        // create world boundary, down wall:
        let downWall = this.createCollisionBody((mapW+blockW), worldLimit, (mapW/2), (mapH-worldLimit), this.wallsMassValue);
        downWall.isWorldWall = true;
        downWall.isWall = true;
        this.addBody(downWall);
        // create world boundary, left wall:
        let leftWall = this.createCollisionBody(worldLimit, (mapH+blockH), 1, (mapH/2), this.wallsMassValue);
        leftWall.isWorldWall = true;
        leftWall.isWall = true;
        this.addBody(leftWall);
        // create world boundary, right wall:
        let rightWall = this.createCollisionBody(worldLimit, (mapH+blockH), (mapW-worldLimit), (mapH/2), this.wallsMassValue);
        rightWall.isWorldWall = true;
        rightWall.isWall = true;
        this.addBody(rightWall);
    }

    /**
     * @internal
     */
    createCollisionBody(
        width,
        height,
        x,
        y,
        mass = 1,
        collisionResponse = true,
        hasState = false,
        bodyKey = false,
        dir = false
    ){
        let boxShape = this.createCollisionShape(width, height, collisionResponse);
        let bodyConfig = {
            mass: mass,
            position: [x, y],
            type: Body.STATIC,
            fixedRotation: true,
            movementSpeed: this.movementSpeed,
            jumpSpeed: this.jumpSpeed,
            jumpTimeMs: this.jumpTimeMs
        };
        let bodyClass = hasState ? PhysicalBody : Body;
        let boxBody = new bodyClass(bodyConfig);
        if(hasState){
            boxBody.bodyState = new ObjectBodyState({
                x: x,
                y: y,
                dir: dir || GameConst.DOWN,
                scene: this.sceneName,
                id: boxBody.id,
                key: bodyKey || '',
                room_id: this.roomId
            });
        }
        boxBody.addShape(boxShape);
        return boxBody;
    }

    /**
     * @internal
     */
    createCollisionShape(width, height, collisionResponse = true)
    {
        let boxShape = new Box({width: width, height: height});
        boxShape.collisionGroup = WorldConst.COL_GROUND;
        boxShape.collisionMask = WorldConst.COL_PLAYER | WorldConst.COL_ENEMY;
        return boxShape;
    }

    /**
     * @internal
     */
    getSceneChangePoints(mapData)
    {
        let changePoints = {};
        for(let i of Object.keys(mapData.changePoints)){
            let changePoint = mapData.changePoints[i];
            changePoints[changePoint[RoomsConst.TILE_INDEX]] = changePoint[RoomsConst.NEXT_SCENE];
        }
        return changePoints;
    }

    createPlayerBody(playerData)
    {
        let boxShape = new Box({width: playerData.width, height: playerData.height});
        // @TODO - BETA - Players collision will be configurable, for now when collisions are active players can
        //   push players.
        boxShape.collisionGroup = WorldConst.COL_PLAYER;
        boxShape.collisionMask = WorldConst.COL_ENEMY | WorldConst.COL_GROUND;
        let boxBody = new PhysicalBody({
            mass: this.playerMassValue,
            position: [playerData.bodyState.x, playerData.bodyState.y],
            type: Body.DYNAMIC,
            fixedRotation: true,
            animationBasedOnPress: this.objectsManager.config.get('client/players/animations/basedOnPress'),
            diagonalHorizontal: this.objectsManager.config.get('client/players/animations/diagonalHorizontal'),
            movementSpeed: this.movementSpeed
        });
        boxBody.playerId = playerData.id;
        boxBody.collideWorldBounds = true;
        boxBody.isChangingScene = false;
        boxBody.isBlocked = false;
        boxBody.addShape(boxShape);
        boxBody.bodyState = playerData.bodyState;
        this.addBody(boxBody);
        return boxBody;
    }

    shootBullet(fromPosition, toPosition, bulletObject)
    {
        let { objectWidth, objectHeight} = bulletObject;
        let wTH = (this.mapJson.tileheight / 2) + (objectHeight / 2);
        let wTW = (this.mapJson.tilewidth / 2) + (objectWidth / 2);
        let bulletY = fromPosition.y + ((toPosition.y > fromPosition.y) ? wTH : -wTH);
        let bulletX = fromPosition.x + ((toPosition.x > fromPosition.x) ? wTW : -wTW);
        let y = toPosition.y - bulletY;
        let x = toPosition.x - bulletX;
        let angleByVelocity = Math.atan2(y, x);
        let bulletKey = (bulletObject.key ? bulletObject.key : '');
        let direction = this.calculateDirection(bulletObject, fromPosition, toPosition);
        let bulletBody = this.createCollisionBody(
            objectWidth,
            objectHeight,
            bulletX,
            bulletY,
            1,
            true,
            true,
            bulletKey,
            direction
        );
        bulletBody.shapes[0].collisionGroup = WorldConst.COL_PLAYER;
        bulletBody.shapes[0].collisionMask = WorldConst.COL_ENEMY | WorldConst.COL_GROUND | WorldConst.COL_PLAYER;
        bulletBody.type = 1; // Body.DYNAMIC;
        bulletBody.updateMassProperties();
        bulletBody.isRoomObject = true;
        bulletBody.roomObject = bulletObject;
        bulletBody.hitPriority = bulletObject.hitPriority ? bulletObject.hitPriority : 2;
        bulletBody.isBullet = true;
        // append body to world:
        this.addBody(bulletBody);
        // and state on room map schema:
        // @NOTE: this index here will be the animation key since the bullet state doesn't have a key property.
        bulletObject.room.state.bodies[bulletKey+'_bullet_'+bulletBody.id] = bulletBody.bodyState;
        // then speed up in the target direction:
        bulletBody.angle = Math.atan2(y, x) * 180 / Math.PI;
        bulletBody.velocity[0] = bulletObject.magnitude * Math.cos(angleByVelocity);
        bulletBody.velocity[1] = bulletObject.magnitude * Math.sin(angleByVelocity);
        // since the enemy won't be hit until the bullet reach the target we need to return false to avoid the onHit
        // automatic actions (for example pve init).
        return bulletBody;
    }

    /**
     * @internal
     */
    calculateDirection(bulletObject, fromPosition, toPosition)
    {
        let animDir = sc.get(bulletObject, 'animDir', false);
        return animDir === 3 ?
            (fromPosition.x < toPosition.x ? GameConst.RIGHT : GameConst.LEFT)
            : (fromPosition.y < toPosition.y ? GameConst.DOWN : GameConst.UP);
    }

}

module.exports.P2worldGravity = P2worldGravity;
