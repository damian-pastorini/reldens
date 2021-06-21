/**
 *
 * Reldens - Respawn Area
 *
 * This will generate and activate the respawn areas.
 *
 */

const { RespawnModel } = require('./model');
const { PathFinder } = require('../../world/server/path-finder');
const { EventsManagerSingleton, sc } = require('@reldens/utils');

class RoomRespawn
{

    constructor(layer, world)
    {
        this.layer = layer;
        this.world = world;
        this.pathFinder = new PathFinder();
        this.pathFinder.world = this.world;
        this.pathFinder.grid = world.pathFinder.grid.clone();
        this.instancesCreated = {};
    }

    async activateObjectsRespawn()
    {
        this.parseMapForRespawnTiles();
        this.layerObjects = this.world.objectsManager.roomObjectsByLayer[this.layer.name];
        let {tilewidth, tileheight } = this.world.mapJson;
        // NOTE: this is because a single layer could have multiple respawn definitions for each enemy type.
        this.respawnDefinitions = await RespawnModel.loadByLayerName(this.layer.name);
        for(let i of Object.keys(this.respawnDefinitions)){
            let respawnArea = this.respawnDefinitions[i];
            if(
                sc.hasOwn(this.layerObjects, respawnArea.object_id)
                && sc.hasOwn(this.layerObjects[respawnArea.object_id], 'respawn')
            ){
                let multipleObj = this.layerObjects[respawnArea.object_id];
                let objClass = multipleObj.classInstance;
                for(let qty=0; qty < respawnArea.instances_limit; qty++){
                    // prepare to save the object:
                    if(!sc.hasOwn(this.instancesCreated, respawnArea.id)){
                        this.instancesCreated[respawnArea.id] = [];
                    }
                    // create object index:
                    let objectIndex = this.createObjectIndex(respawnArea);
                    multipleObj.objProps.client_key = objectIndex;
                    // get random tile:
                    let tileData = this.getRandomTile();
                    // add tile data to the object and create object instance:
                    Object.assign(multipleObj.objProps, tileData);
                    let objInstance = new objClass(multipleObj.objProps);
                    objInstance.runAdditionalSetup(EventsManagerSingleton);
                    let assetsArr = this.getObjectAssets(multipleObj);
                    // @TODO - BETA - Objects could have multiple assets, need to implement and test the case.
                    objInstance.clientParams.asset_key = assetsArr[0];
                    objInstance.clientParams.enabled = true;
                    if(sc.hasOwn(multipleObj, 'multipleAnimations')){
                        objInstance.clientParams.animations = multipleObj.multipleAnimations;
                    }
                    this.world.objectsManager.objectsAnimationsData[objectIndex] = objInstance.clientParams;
                    this.world.objectsManager.roomObjects[objectIndex] = objInstance;
                    await this.world.createWorldObject(
                        objInstance,
                        objectIndex,
                        tilewidth,
                        tileheight,
                        tileData.x,
                        tileData.y,
                        this.pathFinder
                    );
                    objInstance.respawnTime = respawnArea.respawn_time;
                    objInstance.respawnLayer = this.layer.name;
                    this.instancesCreated[respawnArea.id].push(objInstance);
                }
            }
        }
    }

    getObjectAssets(multipleObj)
    {
        let assetsArr = [];
        for(let assetData of multipleObj.objProps.objects_assets){
            assetsArr.push(assetData.asset_key);
        }
        return assetsArr;
    }

    createObjectIndex(respawnArea)
    {
        let newIndex = this.instancesCreated[respawnArea.id].length;
        return this.layer.name + '-' + respawnArea.id + '-' + newIndex;
    }

    getRandomTile()
    {
        let randomTileIndex = this.respawnTiles[Math.floor(Math.random() * this.respawnTiles.length)];
        return this.respawnTilesData[randomTileIndex];
    }

    parseMapForRespawnTiles()
    {
        let layerData = this.layer.data;
        this.respawnTiles = [];
        this.respawnTilesData = {};
        let mapW = this.world.mapJson.width,
            mapH = this.world.mapJson.height,
            tileW = this.world.mapJson.tilewidth,
            tileH = this.world.mapJson.tileheight;
        for(let c = 0; c < mapW; c++){
            let posX = c * tileW + (tileW/2);
            for(let r = 0; r < mapH; r++){
                // position in pixels:
                let posY = r * tileH + (tileH/2);
                let tileIndex = r * mapW + c;
                let tile = layerData[tileIndex];
                // if tile is not zero then it's available for respawn:
                if(tile !== 0){
                    this.respawnTiles.push(tileIndex);
                    this.respawnTilesData[tileIndex] = {x: posX, y: posY, tile: tile, tile_index: tileIndex};
                } else {
                    this.pathFinder.grid.setWalkableAt(c, r, false);
                }
            }
        }
    }

}

module.exports.RoomRespawn = RoomRespawn;
