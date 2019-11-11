/**
 *
 * Reldens - P2world
 *
 * This module handle the physics world on the server.
 *
 */

const P2 = require('p2');
const { GameConst } = require('../../game/constants');

class P2world extends P2.World
{

    /**
     * @param options
     */
    constructor(options)
    {
        super(options);
        this.applyGravity = options.applyGravity;
        this.sceneName = options.sceneName || false;
        this.sceneTiledMapFile = options.roomData.roomMap || false;
        if(!this.sceneName || !this.sceneTiledMapFile){
            console.log('ERROR - World creation missing data in options:', options);
        }
        // objects:
        this.objectsManager = options.objectsManager;
        let themePath = this.objectsManager.config.projectRoot + this.objectsManager.config.projectTheme;
        // @TODO:
        //      - As part of the future admin panel this will be an upload option.
        //      - For now we will have this require here, but is not the best solution, we need to find another way of
        //       require the maps data dynamically (probably centralize a require loop over all the maps files when the
        //       server is generated).
        this.mapJson = require(themePath + '/assets/maps/' + this.sceneTiledMapFile);
        // create world limits:
        this.createLimits();
        // add collisions:
        this.setMapCollisions(options.roomData);
    }

    /**
     * @param mapData
     */
    setMapCollisions(mapData)
    {
        // @TODO: fix maps to create proper body blocks instead of use only boxes for each map block.
        // get scene change points:
        let changePoints = this.getSceneChangePoints(mapData);
        // map data:
        let mapLayers = this.mapJson.layers,
            mapW = this.mapJson.width,
            mapH = this.mapJson.height,
            tileW = this.mapJson.tilewidth,
            tileH = this.mapJson.tileheight;
        for(let layer of mapLayers){
            // just consider collisions and change points layers:
            if(layer.name.indexOf('collisions') !== -1 || layer.name.indexOf('change-points') !== -1){
                let layerData = layer.data;
                for (let c = 0; c < mapW; c++){
                    let posX = c * tileW + (tileW/2);
                    for (let r = 0; r < mapH; r++){
                        // position in pixels
                        let posY = r * tileH + (tileH/2);
                        let tileIndex = r * mapW + c;
                        let tile = layerData[tileIndex];
                        // the 0 value are empty tiles without collisions or change points:
                        if (tile !== 0){
                            // look for change points on the layers with the proper name convention:
                            if(layer.name.indexOf('change-points') !== -1){
                                if(changePoints[tileIndex]){
                                    console.log('INFO - Created change point on tileIndex:', tileIndex);
                                    // @NOTE: we make the change point smaller so the user needs to walk into to hit it.
                                    let bodyChangePoint = this.createCollisionBody((tileW/2), (tileH/2), posX, posY);
                                    bodyChangePoint.changeScenePoint = changePoints[tileIndex];
                                    this.addBody(bodyChangePoint);
                                } else {
                                    console.log('ERROR - Change point not created:', tileIndex, changePoints[tileIndex]);
                                }
                            }
                            // create collisions for layers with the proper name convention:
                            if(layer.name.indexOf('collisions') !== -1){
                                // create a box to fill the space:
                                let bodyWall = this.createCollisionBody(tileW, tileH, posX, posY);
                                bodyWall.isWall = true;
                                this.addBody(bodyWall);
                            }
                        }
                        // objects will be found by layer name + tile index:
                        let objectIndex = layer.name + tileIndex;
                        // this will validate if the object class exists and return an instance of it:
                        let roomObject = this.objectsManager.getObjectData(objectIndex);
                        // if the data and the instance was created:
                        if(roomObject){
                            // handle body fixed position:
                            if(roomObject.hasOwnProperty('xFix')){
                                posX += roomObject.xFix;
                            }
                            if(roomObject.hasOwnProperty('yFix')){
                                posY += roomObject.yFix;
                            }
                            roomObject.x = posX;
                            roomObject.y = posY;
                            // save position in room object:
                            if(this.objectsManager.objectsAnimationsData.hasOwnProperty(objectIndex)){
                                this.objectsManager.objectsAnimationsData[objectIndex].x = posX;
                                this.objectsManager.objectsAnimationsData[objectIndex].y = posY;
                            }
                            // by default objects won't have mass:
                            let bodyMass = 0;
                            // unless it is specified in the object itself:
                            if(roomObject.hasOwnProperty('bodyMass')){
                                bodyMass = roomObject.bodyMass;
                            }
                            // by default objects collision response:
                            let colResponse = false;
                            // unless it is specified in the object itself:
                            if(roomObject.hasOwnProperty('collisionResponse')){
                                colResponse = roomObject.collisionResponse;
                            }
                            // create the body:
                            let bodyObject = this.createCollisionBody(tileW, tileH, posX, posY, bodyMass, colResponse);
                            bodyObject.isRoomObject = true;
                            // assign the room object to the body:
                            bodyObject.roomObject = roomObject;
                            console.log('INFO - Created object for objectIndex:', objectIndex);
                            // try to get object instance from project root:
                            this.addBody(bodyObject);
                        }
                    }
                }
            }
        }
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
        let upWall = this.createCollisionBody((mapW+blockW), worldLimit, (mapW/2), 1);
        upWall.isWorldWall = true;
        this.addBody(upWall);
        // create world boundary, down wall:
        let downWall = this.createCollisionBody((mapW+blockW), worldLimit, (mapW/2), (mapH-worldLimit));
        downWall.isWorldWall = true;
        this.addBody(downWall);
        // create world boundary, left wall:
        let leftWall = this.createCollisionBody(worldLimit, (mapH+blockH), 1, (mapH/2));
        leftWall.isWorldWall = true;
        this.addBody(leftWall);
        // create world boundary, right wall:
        let rightWall = this.createCollisionBody(worldLimit, (mapH+blockH), (mapW-worldLimit), (mapH/2));
        rightWall.isWorldWall = true;
        this.addBody(rightWall);
    }

    createCollisionBody(width, height, x, y, mass = 1, collisionResponse = true)
    {
        let boxShape = this.createCollisionShape(width, height, collisionResponse);
        let bodyConfig = {
            mass: mass,
            position: [x, y],
            type: P2.Body.STATIC,
            fixedRotation: true
        };
        let boxBody = new P2.Body(bodyConfig);
        boxBody.addShape(boxShape);
        return boxBody;
    }

    createCollisionShape(width, height, collisionResponse = true)
    {
        let boxShape = new P2.Box({ width: width, height: height});
        boxShape.collisionGroup = GameConst.COL_GROUND;
        boxShape.collisionMask = GameConst.COL_PLAYER | GameConst.COL_ENEMY;
        boxShape.collisionResponse = collisionResponse;
        return boxShape;
    }

    getSceneChangePoints(mapData)
    {
        let changePoints = {};
        for(let cp in mapData.changePoints){
            let cPoint = mapData.changePoints[cp];
            // example: {"i":167, "n":"other_scene_key_1"}
            changePoints[cPoint.i] = cPoint.n;
        }
        return changePoints;
    }

    createPlayerBody(playerData)
    {
        let boxShape = new P2.Box({width: playerData.width, height: playerData.height});
        boxShape.collisionGroup = GameConst.COL_PLAYER;
        boxShape.collisionMask = GameConst.COL_ENEMY | GameConst.COL_GROUND;
        let boxBody = new P2.Body({
            mass: 1,
            position: [playerData.x, playerData.y],
            type: P2.Body.DYNAMIC,
            fixedRotation: true
        });
        boxBody.addShape(boxShape);
        boxBody.playerId = playerData.id;
        boxBody.isChangingScene = false;
        this.addBody(boxBody);
        // return body:
        return boxBody;
    }

}

module.exports = P2world;