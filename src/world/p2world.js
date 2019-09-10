/**
 *
 * Reldens - P2world
 *
 * This module handle the physics world on the server.
 *
 */

const P2 = require('p2');
const share = require('../utils/constants');

class P2world extends P2.World
{

    constructor(options)
    {
        super(options);
        this.applyGravity = options.applyGravity;
        this.sceneName = options.sceneName || false;
        this.sceneTiledMapFile = options.sceneData.sceneMap || false;
        if(!this.sceneName || !this.sceneTiledMapFile){
            console.log('ERROR - World creation missing data in options:', options);
        }
        // @TODO: as part of the future admin panel this will be an upload option.
        this.mapJson = require('../../pub/assets/maps/'+this.sceneTiledMapFile);
        // create world limits:
        this.createLimits();
        // add collisions:
        this.setMapCollisions(options.sceneData);
    }

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
                        // occupy space or add the scene change points:
                        if (tile !== 0){ // 0 => empty tiles without collision
                            // if the tile is a change point it has to be empty for every layer.
                            if(layer.name.indexOf('change-points') !== -1){
                                if(changePoints[tileIndex]){
                                    console.log('INFO - Created change point on tileIndex:', tileIndex);
                                    // @NOTE: we make the change point smaller so the user needs to walk into to hit it.
                                    let bodyChangePoint = this.createWall((tileW/2), (tileH/2), posX, posY);
                                    bodyChangePoint.changeScenePoint = changePoints[tileIndex];
                                    bodyChangePoint.isWall = true;
                                    this.addBody(bodyChangePoint);
                                } else {
                                    console.log('ERROR - Change point not created:', tileIndex, changePoints[tileIndex]);
                                }
                            }
                            if(layer.name.indexOf('collisions') !== -1){
                                // create a box to fill the space:
                                let bodyWall = this.createWall(tileW, tileH, posX, posY);
                                bodyWall.isWall = true;
                                this.addBody(bodyWall);
                            }
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
        let upWall = this.createWall((mapW+blockW), worldLimit, (mapW/2), 1);
        upWall.isWorldWall = true;
        this.addBody(upWall);
        // create world boundary, down wall:
        let downWall = this.createWall((mapW+blockW), worldLimit, (mapW/2), (mapH-worldLimit));
        downWall.isWorldWall = true;
        this.addBody(downWall);
        // create world boundary, left wall:
        let leftWall = this.createWall(worldLimit, (mapH+blockH), 1, (mapH/2));
        leftWall.isWorldWall = true;
        this.addBody(leftWall);
        // create world boundary, right wall:
        let rightWall = this.createWall(worldLimit, (mapH+blockH), (mapW-worldLimit), (mapH/2));
        rightWall.isWorldWall = true;
        this.addBody(rightWall);
    }

    createWall(width, height, x, y)
    {
        let boxShape = new P2.Box({ width: width, height: height});
        boxShape.collisionGroup = share.COL_GROUND;
        boxShape.collisionMask = share.COL_PLAYER | share.COL_ENEMY;
        let bodyConfig = {
            position: [x, y],
            mass: 1,
            type: P2.Body.STATIC,
            fixedRotation: true
        };
        let boxBody = new P2.Body(bodyConfig);
        boxBody.addShape(boxShape);
        return boxBody;
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
        boxShape.collisionGroup = share.COL_PLAYER;
        boxShape.collisionMask = share.COL_ENEMY | share.COL_GROUND;
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
