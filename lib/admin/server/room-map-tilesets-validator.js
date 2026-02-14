/**
 *
 * Reldens - RoomMapTilesetsValidator
 *
 * Validates room map tilesets and optionally overrides scene_images with map file as source of truth.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class RoomMapTilesetsValidator
{

    /**
     * @param {BaseDataServer} dataServer
     * @param {ConfigManager} config
     */
    constructor(dataServer, config)
    {
        this.dataServer = dataServer;
        this.config = config;
        this.roomsRepository = dataServer.getEntity('rooms');
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async validate(event)
    {
        let overrideEnabled = this.config.getWithoutLogs('server/rooms/maps/overrideSceneImagesWithMapFile', true);
        if(!overrideEnabled){
            return false;
        }
        let driverResource = sc.get(event, 'driverResource', false);
        if(!driverResource || 'rooms' !== driverResource.entityKey){
            return false;
        }
        let entityData = sc.get(event, 'entityData', false);
        if(!entityData){
            return false;
        }
        let mapFilename = sc.get(entityData, 'map_filename', '');
        if(!mapFilename){
            return false;
        }
        let options = sc.get(driverResource, 'options', {});
        let uploadProperties = sc.get(options, 'properties', {});
        let mapProperty = sc.get(uploadProperties, 'map_filename', false);
        let sceneImagesProperty = sc.get(uploadProperties, 'scene_images', false);
        if(!mapProperty || !sceneImagesProperty){
            return false;
        }
        let mapBucket = sc.get(mapProperty, 'bucket', '');
        let sceneImagesBucket = sc.get(sceneImagesProperty, 'bucket', '');
        if(!mapBucket || !sceneImagesBucket){
            return false;
        }
        let mapData = this.readMapFile(mapBucket, mapFilename, entityData.id);
        if(!mapData){
            return false;
        }
        let tilesetImages = this.extractTilesetImages(mapData);
        if(0 === tilesetImages.length){
            return false;
        }
        let currentSceneImages = sc.get(entityData, 'scene_images', '');
        let currentSceneImagesArray = currentSceneImages ? currentSceneImages.split(',') : [];
        if(this.arraysAreEqual(tilesetImages, currentSceneImagesArray)){
            return false;
        }
        let allImagesExist = this.validateImagesExist(tilesetImages, sceneImagesBucket, entityData.id, mapFilename);
        if(!allImagesExist){
            Logger.error('Cannot override scene_images: some tileset images do not exist.', {
                roomId: entityData.id,
                mapFilename,
                tilesetImages
            });
            return false;
        }
        return await this.overrideSceneImages(entityData.id, tilesetImages);
    }

    /**
     * @param {string} mapBucket
     * @param {string} mapFilename
     * @param {number} roomId
     * @returns {Object|boolean}
     */
    readMapFile(mapBucket, mapFilename, roomId)
    {
        let mapFilePath = FileHandler.joinPaths(mapBucket, mapFilename);
        if(!FileHandler.exists(mapFilePath)){
            Logger.warning('Map file not found after room save.', {mapFilePath, roomId});
            return false;
        }
        let mapContents = FileHandler.readFile(mapFilePath);
        if(!mapContents){
            Logger.warning('Could not read map file contents.', {mapFilePath, roomId});
            return false;
        }
        try {
            return JSON.parse(mapContents);
        } catch (error) {
            Logger.warning('Invalid JSON in map file.', {mapFilePath, roomId, error: error.message});
            return false;
        }
    }

    /**
     * @param {Object} mapData
     * @returns {Array<string>}
     */
    extractTilesetImages(mapData)
    {
        let tilesets = sc.get(mapData, 'tilesets', []);
        if(!sc.isArray(tilesets) || 0 === tilesets.length){
            return [];
        }
        let images = [];
        for(let tileset of tilesets){
            let tilesetImage = sc.get(tileset, 'image', '');
            if(!tilesetImage){
                continue;
            }
            let imageFileName = tilesetImage.split('/').pop();
            if(-1 === images.indexOf(imageFileName)){
                images.push(imageFileName);
            }
        }
        return images;
    }

    /**
     * @param {Array<string>} tilesetImages
     * @param {string} sceneImagesBucket
     * @param {number} roomId
     * @param {string} mapFilename
     * @returns {boolean}
     */
    validateImagesExist(tilesetImages, sceneImagesBucket, roomId, mapFilename)
    {
        for(let imageFileName of tilesetImages){
            let imageFilePath = FileHandler.joinPaths(sceneImagesBucket, imageFileName);
            if(!FileHandler.exists(imageFilePath)){
                Logger.warning('Tileset image not found in scene_images folder.', {
                    imageFileName,
                    imageFilePath,
                    roomId,
                    mapFilename
                });
                return false;
            }
        }
        return true;
    }

    /**
     * @param {Array<string>} array1
     * @param {Array<string>} array2
     * @returns {boolean}
     */
    arraysAreEqual(array1, array2)
    {
        if(array1.length !== array2.length){
            return false;
        }
        let sorted1 = [...array1].sort();
        let sorted2 = [...array2].sort();
        for(let i = 0; i < sorted1.length; i++){
            if(sorted1[i] !== sorted2[i]){
                return false;
            }
        }
        return true;
    }

    /**
     * @param {number} roomId
     * @param {Array<string>} tilesetImages
     * @returns {Promise<boolean>}
     */
    async overrideSceneImages(roomId, tilesetImages)
    {
        let sceneImagesValue = tilesetImages.join(',');
        let updateResult = await this.roomsRepository.updateById(roomId, {scene_images: sceneImagesValue});
        if(!updateResult){
            Logger.error('Failed to override scene_images with map file tilesets.', {roomId, tilesetImages});
            return false;
        }
        Logger.info('Overrode scene_images with map file tilesets.', {roomId, tilesetImages, sceneImagesValue});
        return true;
    }

    /**
     * @param {Object} entityData - The loaded entity data
     * @param {Object} driverResource - Driver resource with properties config
     * @returns {Array<string>|boolean}
     */
    extractTilesetImagesFromEntity(entityData, driverResource)
    {
        if(!entityData){
            return false;
        }
        let mapFilename = sc.get(entityData, 'map_filename', '');
        if(!mapFilename){
            return false;
        }
        let mapBucket = sc.get(driverResource?.options?.properties?.map_filename, 'bucket', '');
        if(!mapBucket){
            return false;
        }
        let mapData = this.readMapFile(mapBucket, mapFilename, entityData.id);
        if(!mapData){
            return false;
        }
        return this.extractTilesetImages(mapData);
    }

}

module.exports.RoomMapTilesetsValidator = RoomMapTilesetsValidator;
