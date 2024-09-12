/**
 *
 * Reldens - RoomRespawn
 *
 */

const { PathFinder } = require('../../world/server/path-finder');
const { Logger, sc } = require('@reldens/utils');

class RoomRespawn
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomRespawn.');
        }
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in RespawnPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in RoomRespawn.');
        }
        this.layer = props.layer;
        this.world = props.world;
        this.pathFinder = false;
        if(props.world.pathFinder){
            this.pathFinder = new PathFinder();
            this.pathFinder.world = this.world;
            this.pathFinder.grid = props.world.pathFinder.grid.clone();
        }
        this.instancesCreated = {};
        this.usedTiles = [];
    }

    async activateObjectsRespawn()
    {
        this.parseMapForRespawnTiles();
        this.layerObjects = this.world.objectsManager.roomObjectsByLayer[this.layer.name];
        if(!this.layerObjects){
            Logger.warning('Layer "'+this.layer.name+'" objects not found.');
            return false;
        }
        Logger.debug('Layer "'+this.layer.name+'" objects: '+ JSON.stringify(Object.keys(this.layerObjects)));
        let {tilewidth, tileheight } = this.world.mapJson;
        // NOTE: this is because a single layer could have multiple respawn definitions for each enemy type.
        this.respawnDefinitions = await this.dataServer.getEntity('respawn').loadBy('layer', this.layer.name);
        for(let i of Object.keys(this.respawnDefinitions)){
            let respawnArea = this.respawnDefinitions[i];
            if(!sc.hasOwn(this.layerObjects, respawnArea.object_id)){
                Logger.warning('Object "'+respawnArea.object_id+'" not present in layerObjects.');
                continue;
            }
            if(!sc.hasOwn(this.layerObjects[respawnArea.object_id], 'shouldRespawn')){
                Logger.warning('Object "'+respawnArea.object_id+'" missing property "shouldRespawn".');
                continue;
            }
            let multipleObj = this.layerObjects[respawnArea.object_id];
            if(!multipleObj.objProps.enabled){
                Logger.warning('Respawn object "'+respawnArea.object_id+'" is disabled.');
                continue;
            }
            let objClass = multipleObj.classInstance;
            if(!objClass){
                Logger.warning('Object Class not specified.', respawnArea, multipleObj);
                continue;
            }
            for(let qty=0; qty < respawnArea.instances_limit; qty++){
                await this.createNewObjectInstance(respawnArea, multipleObj, objClass, tilewidth, tileheight);
            }
        }
    }

    async createNewObjectInstance(respawnArea, multipleObj, objClass, tilewidth, tileheight)
    {
        if(!sc.hasOwn(this.instancesCreated, respawnArea.id)){
            this.instancesCreated[respawnArea.id] = [];
        }
        let objectIndex = this.generateObjectIndex(respawnArea);
        let clonedObjProps = Object.assign({}, multipleObj.objProps);
        clonedObjProps.client_key = objectIndex;
        clonedObjProps.events = this.events;
        let {randomTileIndex, tileData} = this.getRandomTile(objectIndex);
        // add tile data to the object and create object instance:
        Object.assign(clonedObjProps, tileData);
        let objInstance = new objClass(clonedObjProps);
        if(sc.isObjectFunction(objInstance, 'runAdditionalRespawnSetup')){
            await objInstance.runAdditionalRespawnSetup();
        }
        this.events.emit('reldens.afterRunAdditionalRespawnSetup', {
            objInstance,
            clonedObjProps,
            respawnArea,
            multipleObj,
            objClass,
            objectIndex,
            roomRespawn: this
        });
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
        objInstance.objectIndex = objectIndex;
        objInstance.randomTileIndex = randomTileIndex;
        this.instancesCreated[respawnArea.id].push(objInstance);
        Logger.debug({respawnCreatedWorldObject: objInstance.uid});
    }

    getObjectAssets(multipleObj)
    {
        let assetsArr = [];
        for(let assetData of multipleObj.objProps.objects_assets){
            assetsArr.push(assetData.asset_key);
        }
        return assetsArr;
    }

    generateObjectIndex(respawnArea)
    {
        let newIndex = this.instancesCreated[respawnArea.id].length;
        Logger.debug(
            'Generating new object index.',
            {layerName: this.layer.name, newIndex, respawnAreaId: respawnArea.id}
        );
        return this.layer.name + '-' + respawnArea.id + '-' + newIndex;
    }

    getRandomTile(objectIndex)
    {
        let randomIndex = Math.floor(Math.random() * this.respawnTiles.length);
        let randomTileIndex = this.respawnTiles[randomIndex];
        if(sc.hasOwn(this.usedTiles, randomTileIndex)){
            return this.getRandomTile(objectIndex);
        }
        this.usedTiles[randomTileIndex] = objectIndex;
        return {randomTileIndex, tileData: this.respawnTilesData[randomTileIndex]};
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
        let totalTiles = 0;
        let totalRespawnTiles = 0;
        for(let c = 0; c < mapW; c++){
            let posX = c * tileW + (tileW/2);
            for(let r = 0; r < mapH; r++){
                totalTiles++;
                // position in units:
                let posY = r * tileH + (tileH/2);
                let tileIndex = r * mapW + c;
                let tile = Number(layerData[tileIndex]);
                // if tile is not zero then it's available for respawn:
                if(0 !== tile){
                    totalRespawnTiles++;
                    this.respawnTiles.push(tileIndex);
                    this.respawnTilesData[tileIndex] = {
                        x: posX,
                        y: posY,
                        tile: tile,
                        tile_index: tileIndex,
                        row: r,
                        column: c
                    };
                }
                if(0 === tile && this.pathFinder){
                    this.pathFinder.grid.setWalkableAt(c, r, false);
                }
            }
        }
    }

}

module.exports.RoomRespawn = RoomRespawn;
