const P2 = require('p2');
const share = require('../../shared/constants');

class P2world extends P2.World
{

    constructor(options)
    {
        super(options);
        this.sceneName = options.sceneName || false;
        this.sceneTiledMapFile = options.sceneTiledMapFile || false;
        if(!this.sceneName || !this.sceneTiledMapFile){
            console.log('ERROR - World creation missing data in options:', options);
        }
        // @TODO: as part of the future admin panel this will be an upload option.
        this.mapJson = require('../../client/assets/maps/'+this.sceneTiledMapFile);
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
        // @NOTE: for collisions in server side we need to include the defined main layer.
        let mainLayer = mapData.layers.main;
        mapData.layers.collider[mapData.layers.collider.length] = mainLayer;
        for(let colliderIndex of mapData.layers.collider){
            if(mapLayers[colliderIndex]){
                let layerData = mapLayers[colliderIndex].data;
                for (let c = 0; c < mapW; c++){
                    let posX = c * tileW + (tileW/2);
                    for (let r = 0; r < mapH; r++){
                        // position in pixels
                        let posY = r * tileH + (tileH/2);
                        let tileIndex = r * mapW + c;
                        let tile = layerData[tileIndex];
                        // occupy space or add the scene change points:
                        if (tile !== 0){ // 0 => empty tiles without collision
                            // if the tile is a change point has to be empty for every layer.
                            if(changePoints[tile]){
                                // only create the change points once on the main layer:
                                if(colliderIndex === mainLayer){
                                    // @NOTE: we make the change point smaller so the user needs to walk into to hit it.
                                    let bodyChangePoint = this.createWall((tileW/2), (tileH/2), posX, posY);
                                    bodyChangePoint.changeScenePoint = changePoints[tile];
                                    bodyChangePoint.isWall = true;
                                    this.addBody(bodyChangePoint);
                                } // that's why we don't have an else for the main layer condition here.
                            } else {
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
        for(let cp in mapData.layers.change_points){
            let cPoint = mapData.layers.change_points[cp];
            // example: {"i":167, "n":"other_scene_key_1"}
            changePoints[cPoint.i] = cPoint.n;
        }
        return changePoints;
    }

}

module.exports = P2world;
