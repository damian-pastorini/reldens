/**
 *
 * Reldens - P2world
 *
 * This module handle the physics world on the server.
 *
 */

const { World, Body, Box, Material } = require('p2');
const { PathFinder } = require('./path-finder');
const { PhysicalBody } = require('./physical-body');
const { ObjectBodyState } = require('./object-body-state');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class P2world extends World
{

    constructor(options)
    {
        super(options);
        this.events = sc.get(options, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in P2world.');
        }
        this.roomId = options.roomData.roomId;
        this.applyGravity = options.applyGravity;
        this.applyDamping = options.applyDamping || false;
        this.sceneName = options.sceneName || false;
        this.sceneTiledMapFile = options.roomData.roomMap || false;
        this.tryClosestPath = options.tryClosestPath || false;
        this.onlyWalkable = options.onlyWalkable || false;
        this.worldSpeed = options.worldSpeed || false;
        this.materials = {player: new Material(1), wall: new Material(2), bodies: new Material(3)};
        // this.defaultContactMaterial.friction = options.defaultContactMaterialFriction || 0.5;
        // this.setGlobalStiffness((options.globalStiffNess || 1e5));
        // keys events:
        this.allowSimultaneous = options.allowSimultaneous;
        if(!this.sceneName || !this.sceneTiledMapFile){
            ErrorManager.error(['World creation missing data in options:', options]);
        }
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
        this.pathFinder = new PathFinder();
        this.pathFinder.world = this;
        this.pathFinder.createGridFromMap();
        this.removeBodies = [];
    }

    /**
     * @param mapData
     */
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
        for(let layer of mapLayers){
            let layerData = layer.data;
            await this.events.emit('reldens.parsingMapLayerBefore', layer, this);
            for(let c = 0; c < mapW; c++){
                let posX = c * tileW + (tileW/2);
                for(let r = 0; r < mapH; r++){
                    // position in pixels:
                    let posY = r * tileH + (tileH/2);
                    let tileIndex = r * mapW + c;
                    let tile = layerData[tileIndex];
                    // the 0 value are empty tiles without collisions or change points:
                    if(
                        0 !== Number(tile)
                        && (layer.name.indexOf('change-points') !== -1 || layer.name.indexOf('collisions') !== -1)
                    ){
                        this.createCollision(layer.name, tileIndex, tileW, tileH, posX, posY);
                        this.pathFinder.grid.setWalkableAt(c, r, false);
                    }
                    if(tile === 0 && layer.name.indexOf('pathfinder') !== -1){
                        this.pathFinder.grid.setWalkableAt(c, r, false);
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

    createCollision(layerName, tileIndex, tileW, tileH, posX, posY)
    {
        // look for change points on the layers with the proper name convention:
        if(layerName.indexOf('change-points') !== -1){
            if(this.changePoints[tileIndex]){
                Logger.info('Created change point on tileIndex: ' + tileIndex);
                // @NOTE: we make the change point smaller so the user needs to walk into to hit it.
                let bodyChangePoint = this.createCollisionBody((tileW/2), (tileH/2), posX, posY);
                bodyChangePoint.changeScenePoint = this.changePoints[tileIndex];
                this.addBody(bodyChangePoint);
            } else {
                Logger.error(['Change point data not found in this.changePoints for tileIndex:', tileIndex]);
            }
        }
        // create collisions for layers with the proper name convention:
        if(layerName.indexOf('collisions') !== -1){
            // create a box to fill the space:
            let bodyWall = this.createCollisionBody(tileW, tileH, posX, posY, (this.applyGravity ? 0 : 1));
            bodyWall.isWall = true;
            this.addBody(bodyWall);
        }
    }

    async createWorldObject(roomObject, objectIndex, tileW, tileH, posX, posY, pathFinder = false)
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
        if(pathFinder){
            bodyObject.pathFinder = pathFinder;
        }
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
            posY,
            pathFinder
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
        let upWall = this.createCollisionBody((mapW+blockW), worldLimit, (mapW/2), 1, 0);
        upWall.isWorldWall = true;
        upWall.isWall = true;
        this.addBody(upWall);
        // create world boundary, down wall:
        let downWall = this.createCollisionBody((mapW+blockW), worldLimit, (mapW/2), (mapH-worldLimit), 0);
        downWall.isWorldWall = true;
        downWall.isWall = true;
        this.addBody(downWall);
        // create world boundary, left wall:
        let leftWall = this.createCollisionBody(worldLimit, (mapH+blockH), 1, (mapH/2), 0);
        leftWall.isWorldWall = true;
        leftWall.isWall = true;
        this.addBody(leftWall);
        // create world boundary, right wall:
        let rightWall = this.createCollisionBody(worldLimit, (mapH+blockH), (mapW-worldLimit), (mapH/2), 0);
        rightWall.isWorldWall = true;
        rightWall.isWall = true;
        this.addBody(rightWall);
    }

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
            fixedRotation: true
        };
        let bodyClass = Body;
        if(hasState){
            bodyClass = PhysicalBody;
        }
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

    createCollisionShape(width, height, collisionResponse = true)
    {
        let boxShape = new Box({ width: width, height: height});
        boxShape.collisionGroup = GameConst.COL_GROUND;
        boxShape.collisionMask = GameConst.COL_PLAYER | GameConst.COL_ENEMY;
        boxShape.collisionResponse = collisionResponse;
        return boxShape;
    }

    getSceneChangePoints(mapData)
    {
        let changePoints = {};
        for(let i of Object.keys(mapData.changePoints)){
            let cPoint = mapData.changePoints[i];
            // example: {"i":167, "n":"other_scene_key_1"}
            changePoints[cPoint.i] = cPoint.n;
        }
        return changePoints;
    }

    createPlayerBody(playerData)
    {
        let boxShape = new Box({width: playerData.width, height: playerData.height});
        boxShape.collisionGroup = GameConst.COL_PLAYER;
        // @TODO - BETA - Players collision will be configurable, for now when collisions are active players can
        //   push players.
        boxShape.collisionMask = GameConst.COL_ENEMY | GameConst.COL_GROUND | GameConst.COL_PLAYER;
        let boxBody = new PhysicalBody({
            mass: 1,
            position: [playerData.bodyState.x, playerData.bodyState.y],
            type: Body.DYNAMIC,
            fixedRotation: true,
            animationBasedOnPress: this.objectsManager.config.get('client/players/animations/basedOnPress'),
            diagonalHorizontal: this.objectsManager.config.get('client/players/animations/diagonalHorizontal')
        });
        boxBody.addShape(boxShape);
        boxBody.playerId = playerData.id;
        boxBody.isChangingScene = false;
        boxBody.isBlocked = false;
        boxBody.bodyState = playerData.bodyState;
        this.addBody(boxBody);
        // return body:
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
        bulletBody.shapes[0].collisionGroup = GameConst.COL_PLAYER;
        bulletBody.shapes[0].collisionMask = GameConst.COL_ENEMY | GameConst.COL_GROUND | GameConst.COL_PLAYER;
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

    calculateDirection(bulletObject, fromPosition, toPosition)
    {
        let animDir = sc.get(bulletObject, 'animDir', false);
        return animDir === 3 ?
            (fromPosition.x < toPosition.x ? GameConst.RIGHT : GameConst.LEFT)
            : (fromPosition.y < toPosition.y ? GameConst.DOWN : GameConst.UP);
    }

}

module.exports.P2world = P2world;
