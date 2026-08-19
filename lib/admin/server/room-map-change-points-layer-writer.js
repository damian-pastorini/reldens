/**
 *
 * Reldens - RoomMapChangePointsLayerWriter
 *
 * Marks a change point tile in the room map "change-points" layer, creating that layer when the map does not
 * have one, and saves the change point as a layer property so the map keeps the association when it is imported
 * into another installation. The tile used to mark the change point is the one already visible in that position,
 * taken from the topmost layer that has a tile on it, so the marked tile does not change how the map looks.
 *
 */

const { PublishedMapMerger } = require('../../import/server/published-map-merger');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./map-elements-backup-archive').MapElementsBackupArchive} MapElementsBackupArchive
 * @typedef {import('../../config/server/manager').ConfigManager} ConfigManager
 */
class RoomMapChangePointsLayerWriter
{

    /**
     * @param {MapElementsBackupArchive} backupArchive
     * @param {ConfigManager} config
     */
    constructor(backupArchive, config)
    {
        /** @type {MapElementsBackupArchive} */
        this.backupArchive = backupArchive;
        /** @type {ConfigManager} */
        this.config = config;
        /** @type {PublishedMapMerger} */
        this.publishedMapMerger = new PublishedMapMerger(config);
        /** @type {string} */
        this.layerNameKey = 'change-points';
        /** @type {string} */
        this.changePointPropertyPrefix = 'change-point-for-';
    }

    /**
     * @param {string} mapFileName
     * @param {number|string} tileIndex
     * @param {string} nextRoomName
     * @returns {boolean}
     */
    write(mapFileName, tileIndex, nextRoomName)
    {
        if(!mapFileName){
            Logger.error('Missing map file name to write the change points layer.', tileIndex, nextRoomName);
            return false;
        }
        let mapName = String(mapFileName).replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '');
        if(!this.backupArchive.ensureLiveFromRuntime(mapName)){
            Logger.error('The map file is not available to write the change points layer.', mapName);
            return false;
        }
        let livePath = this.backupArchive.path('live', mapName);
        let mapJson = FileHandler.fetchFileJson(livePath);
        if(!mapJson){
            Logger.error('The map file could not be parsed to write the change points layer.', livePath);
            return false;
        }
        if(!this.applyChangePoint(mapJson, tileIndex, nextRoomName)){
            return false;
        }
        this.backupArchive.writeBackupPair(mapName);
        if(!FileHandler.writeFile(livePath, sc.toJsonString(mapJson))){
            Logger.error('The map file could not be saved with the change points layer.', livePath);
            return false;
        }
        this.publishMap(mapName, mapJson);
        Logger.info('Change point marked in the map change points layer.', mapName, tileIndex, nextRoomName);
        return true;
    }

    /**
     * @param {Object} mapJson
     * @param {number|string} tileIndex
     * @param {string} nextRoomName
     * @returns {boolean}
     */
    applyChangePoint(mapJson, tileIndex, nextRoomName)
    {
        let mapTileIndex = Number(tileIndex);
        if(!sc.isArray(mapJson.layers) || !this.isValidTileIndex(mapJson, mapTileIndex)){
            Logger.error('The change point tile index is not valid for the map.', {
                tileIndex,
                width: mapJson.width,
                height: mapJson.height
            });
            return false;
        }
        let tileGid = this.fetchVisibleTileGid(mapJson, mapTileIndex);
        if(!tileGid){
            Logger.warning(
                'The change point tile position is empty in every map layer, the change points layer tile can '
                +'not be resolved.',
                mapTileIndex
            );
            return false;
        }
        let changePointsLayer = this.fetchChangePointsLayer(mapJson);
        changePointsLayer.data[mapTileIndex] = tileGid;
        this.appendChangePointProperty(changePointsLayer, mapTileIndex, nextRoomName);
        return true;
    }

    /**
     * @param {Object} mapJson
     * @param {number} mapTileIndex
     * @returns {boolean}
     */
    isValidTileIndex(mapJson, mapTileIndex)
    {
        if(isNaN(mapTileIndex) || 0 > mapTileIndex){
            return false;
        }
        return mapTileIndex < (Number(mapJson.width) * Number(mapJson.height));
    }

    /**
     * @param {Object} mapJson
     * @param {number} mapTileIndex
     * @returns {number|boolean}
     */
    fetchVisibleTileGid(mapJson, mapTileIndex)
    {
        for(let i = mapJson.layers.length - 1; 0 <= i; i--){
            let layer = mapJson.layers[i];
            if('tilelayer' !== layer.type || !sc.isArray(layer.data)){
                continue;
            }
            if(-1 !== String(layer.name).indexOf(this.layerNameKey)){
                continue;
            }
            let tileGid = Number(layer.data[mapTileIndex]);
            if(tileGid){
                return tileGid;
            }
        }
        return false;
    }

    /**
     * @param {Object} mapJson
     * @returns {Object}
     */
    fetchChangePointsLayer(mapJson)
    {
        for(let layer of mapJson.layers){
            if('tilelayer' === layer.type && -1 !== String(layer.name).indexOf(this.layerNameKey)){
                return layer;
            }
        }
        return this.createChangePointsLayer(mapJson);
    }

    /**
     * @param {Object} mapJson
     * @returns {Object}
     */
    createChangePointsLayer(mapJson)
    {
        let layerData = [];
        let totalTiles = Number(mapJson.width) * Number(mapJson.height);
        for(let i = 0; i < totalTiles; i++){
            layerData.push(0);
        }
        let changePointsLayer = {
            data: layerData,
            height: mapJson.height,
            id: this.fetchNextLayerId(mapJson),
            name: this.layerNameKey,
            opacity: 1,
            type: 'tilelayer',
            visible: true,
            width: mapJson.width,
            x: 0,
            y: 0
        };
        mapJson.layers.push(changePointsLayer);
        return changePointsLayer;
    }

    /**
     * @param {Object} mapJson
     * @returns {number}
     */
    fetchNextLayerId(mapJson)
    {
        let nextLayerId = Number(sc.get(mapJson, 'nextlayerid', 0));
        if(!nextLayerId){
            return mapJson.layers.length + 1;
        }
        mapJson.nextlayerid = nextLayerId + 1;
        return nextLayerId;
    }

    /**
     * @param {Object} changePointsLayer
     * @param {number} mapTileIndex
     * @param {string} nextRoomName
     * @returns {boolean}
     */
    appendChangePointProperty(changePointsLayer, mapTileIndex, nextRoomName)
    {
        if(!nextRoomName){
            return false;
        }
        if(!sc.isArray(changePointsLayer.properties)){
            changePointsLayer.properties = [];
        }
        let propertyName = this.changePointPropertyPrefix+nextRoomName;
        for(let property of changePointsLayer.properties){
            if(propertyName === property.name && mapTileIndex === Number(property.value)){
                return false;
            }
        }
        changePointsLayer.properties.push({name: propertyName, type: 'int', value: mapTileIndex});
        return true;
    }

    /**
     * @param {string} mapName
     * @param {Object} mapJson
     * @returns {boolean}
     */
    publishMap(mapName, mapJson)
    {
        let elementsPath = this.backupArchive.path('liveElements', mapName);
        if(!FileHandler.exists(elementsPath)){
            this.backupArchive.syncRuntimeCopies(mapName);
            return this.refreshRuntimeMap(mapName);
        }
        this.publishedMapMerger.mergeAndPublish(
            mapJson,
            FileHandler.fetchFileJson(elementsPath),
            this.backupArchive.path('assets', mapName),
            this.backupArchive.path('dist', mapName)
        );
        return this.refreshRuntimeMap(mapName);
    }

    /**
     * @param {string} mapName
     * @returns {boolean}
     */
    refreshRuntimeMap(mapName)
    {
        let loadedMaps = this.config?.getWithoutLogs('server/maps', false);
        if(!loadedMaps){
            return false;
        }
        let publishedMap = FileHandler.fetchFileJson(this.backupArchive.path('assets', mapName));
        if(!publishedMap){
            return false;
        }
        loadedMaps[mapName] = publishedMap;
        return true;
    }

}

module.exports.RoomMapChangePointsLayerWriter = RoomMapChangePointsLayerWriter;
