/**
 *
 * Reldens - MapImageExtruder
 *
 * Reldens-side coordinator for the imported-map tileset extrusion: creates the original image
 * backups, resolves the Reldens paths and config values, delegates the extrusion and map JSON
 * adjustments to the tile-map-optimizer's MapTilesetsExtruder, and writes the updated map file.
 *
 */

const { MapTilesetsExtruder } = require('@reldens/tile-map-optimizer');
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
        /** @type {string} */
        this.originalImagesSubFolder = 'original-map-images';
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
        let tilesetsExtruder = new MapTilesetsExtruder({
            margin: Number(sc.get(this.handlerParams, 'margin', 0)),
            spacing: Number(sc.get(this.handlerParams, 'spacing', 0)),
            color: sc.get(this.handlerParams, 'color', 0xffffff00),
            extrusion: Number(sc.get(this.handlerParams, 'extrusion', 1)),
            tilesetMargin: this.config.getWithoutLogs('maps/extrude/margin', 1),
            tilesetSpacing: this.config.getWithoutLogs('maps/extrude/spacing', 2),
            resolveInputPath: (image) => FileHandler.joinPaths(
                this.generatedDataPath,
                this.originalImagesSubFolder,
                image.replace('.png', '-original.png')
            ),
            resolveOutputPath: (image) => FileHandler.joinPaths(this.generatedDataPath, image)
        });
        let extrudeResult = await tilesetsExtruder.extrudeMapImages(mapJson, mapsImages);
        if(extrudeResult.errorCode){
            return extrudeResult;
        }
        await FileHandler.updateFileContents(
            FileHandler.joinPaths(this.generatedDataPath, mapFileName),
            sc.toJsonString(mapJson)
        );
        return {result: true};
    }

    /**
     * @param {Array<string>} fileNames
     * @returns {Promise<boolean>}
     */
    async copyExtrudedFiles(fileNames)
    {
        FileHandler.createFolder(FileHandler.joinPaths(this.generatedDataPath, this.originalImagesSubFolder));
        for(let fileName of fileNames){
            let from = FileHandler.joinPaths(this.generatedDataPath, fileName);
            let to = FileHandler.joinPaths(
                this.generatedDataPath,
                this.originalImagesSubFolder,
                fileName.replace('.png', '-original.png')
            );
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
