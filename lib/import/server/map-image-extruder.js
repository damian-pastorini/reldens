/**
 *
 * Reldens - MapImageExtruder
 *
 * Handles the tileset image extrusion for an imported map: creates the original image backups,
 * runs the extrusion for each tileset image, saves the resulting files and applies the margin,
 * spacing and size adjustments to both the tilesets and the map JSON.
 *
 */

const { TileExtruder } = require('@reldens/tile-map-optimizer');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../config/client/config-manager').ConfigManager} ConfigManager
 */
class MapImageExtruder
{

    /**
     * @param {string} generatedDataPath
     * @param {Object<string, any>} handlerParams
     * @param {ConfigManager} config
     */
    constructor(generatedDataPath, handlerParams, config)
    {
        /** @type {string} */
        this.generatedDataPath = generatedDataPath;
        /** @type {Object<string, any>} */
        this.handlerParams = handlerParams || {};
        /** @type {ConfigManager} */
        this.config = config;
    }

    /**
     * @param {string} mapName
     * @param {string} mapFileName
     * @param {Array<string>} mapsImages
     * @param {Object} mapJson
     * @returns {Promise<Object>}
     */
    async extrudeMap(mapName, mapFileName, mapsImages, mapJson)
    {
        let createExtrudeBackups = await this.copyExtrudedFiles(mapsImages);
        if(!createExtrudeBackups){
            return {errorCode: 'createExtrudeBackupsError'};
        }
        let margin = Number(sc.get(this.handlerParams, 'margin', 0));
        for(let image of mapsImages){
            let imageResult = await this.extrudeMapImage(image, mapJson, margin);
            if(imageResult.errorCode){
                return imageResult;
            }
        }
        if(margin){
            mapJson.tilewidth = mapJson.tilewidth + 2 * margin;
            mapJson.tileheight = mapJson.tileheight + 2 * margin;
        }
        await FileHandler.updateFileContents(
            FileHandler.joinPaths(this.generatedDataPath, mapFileName),
            sc.toJsonString(mapJson)
        );
        return {result: true};
    }

    /**
     * @param {string} image
     * @param {Object} mapJson
     * @param {number} margin
     * @returns {Promise<Object>}
     */
    async extrudeMapImage(image, mapJson, margin)
    {
        let inputPath = image.replace('.png', '-original.png');
        let inputFullPath = FileHandler.joinPaths(this.generatedDataPath, inputPath);
        let imageObject = await this.extrudeImageObject(image, mapJson, inputFullPath, margin);
        if(!imageObject){
            return {errorCode: 'imageObjectExtrudeError'};
        }
        let outputFullPath = FileHandler.joinPaths(this.generatedDataPath, image);
        let saved = await this.saveImageObject(image, imageObject, outputFullPath);
        if(!saved){
            return {errorCode: 'imageObjectSaveError'};
        }
        this.applyTilesetAdjustments(mapJson, image, imageObject, margin);
        return {result: true};
    }

    /**
     * @param {string} image
     * @param {Object} mapJson
     * @param {string} inputFullPath
     * @param {number} margin
     * @returns {Promise<Object|boolean>}
     */
    async extrudeImageObject(image, mapJson, inputFullPath, margin)
    {
        try {
            return await (new TileExtruder()).extrude(
                mapJson.tilewidth,
                mapJson.tileheight,
                inputFullPath,
                {
                    margin,
                    spacing: Number(sc.get(this.handlerParams, 'spacing', 0)),
                    color: sc.get(this.handlerParams, 'color', 0xffffff00),
                    extrusion: Number(sc.get(this.handlerParams, 'extrusion', 1))
                }
            );
        } catch (error) {
            Logger.critical('Image object could not be extruded.', image, error);
            return false;
        }
    }

    /**
     * @param {string} image
     * @param {Object} imageObject
     * @param {string} outputFullPath
     * @returns {Promise<boolean>}
     */
    async saveImageObject(image, imageObject, outputFullPath)
    {
        try {
            await imageObject.toFile(outputFullPath);
            return true;
        } catch (error) {
            Logger.critical('Image object could not be saved as file.', image, error);
            return false;
        }
    }

    /**
     * @param {Object} mapJson
     * @param {string} image
     * @param {Object} imageObject
     * @param {number} margin
     * @returns {void}
     */
    applyTilesetAdjustments(mapJson, image, imageObject, margin)
    {
        for(let tileset of mapJson.tilesets){
            if(tileset.image !== image){
                continue;
            }
            tileset.margin = this.config.getWithoutLogs('maps/extrude/margin', 1);
            tileset.spacing = this.config.getWithoutLogs('maps/extrude/spacing', 2);
            tileset.imagewidth = imageObject.width;
            tileset.imageheight = imageObject.height;
            if(margin){
                tileset.tilewidth = tileset.tilewidth + 2 * margin;
                tileset.tileheight = tileset.tileheight + 2 * margin;
            }
        }
    }

    /**
     * @param {Array<string>} fileNames
     * @returns {Promise<boolean>}
     */
    async copyExtrudedFiles(fileNames)
    {
        for(let fileName of fileNames){
            let from = FileHandler.joinPaths(this.generatedDataPath, fileName);
            let to = FileHandler.joinPaths(this.generatedDataPath, fileName.replace('.png', '-original.png'));
            let result = FileHandler.copyFile(from, to);
            if(!result){
                Logger.error('File copy error.', FileHandler.error);
                return false;
            }
        }
        return true;
    }

}

module.exports.MapImageExtruder = MapImageExtruder;
