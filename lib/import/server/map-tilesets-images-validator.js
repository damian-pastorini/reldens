/**
 *
 * Reldens - MapTilesetsImagesValidator
 *
 * Validates the tilesets images of an imported map JSON: the map needs at least one tileset, every tileset an image
 * that is a file name without folders and that exists in the generated folder, so the import never copies or removes
 * a file outside that folder. It returns the map images without repeated ones, or false with the error code set.
 *
 */

const { MapsWizardFileNamesValidator } = require('../../admin/server/maps-wizard-file-names-validator');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class MapTilesetsImagesValidator
{

    constructor()
    {
        /** @type {MapsWizardFileNamesValidator} */
        this.fileNamesValidator = new MapsWizardFileNamesValidator();
        /** @type {string} */
        this.errorCode = '';
    }

    /**
     * @param {string} mapName
     * @param {Object} mapJson
     * @param {string} generatedDataPath
     * @returns {Array<string>|false}
     */
    fetchValidImages(mapName, mapJson, generatedDataPath)
    {
        let tilesets = mapJson?.tilesets || [];
        if(0 === tilesets.length){
            Logger.critical('File "' + mapName + '.json" must have at least one tileset.');
            this.errorCode = 'mapJsonMissingTileset';
            return false;
        }
        let mapImages = [];
        for(let tileset of tilesets){
            this.errorCode = this.fetchImageErrorCode(mapName, tileset.image, generatedDataPath);
            if('' !== this.errorCode){
                return false;
            }
            if(-1 === mapImages.indexOf(tileset.image)){
                mapImages.push(tileset.image);
            }
        }
        return mapImages;
    }

    /**
     * @param {string} mapName
     * @param {string} image
     * @param {string} generatedDataPath
     * @returns {string}
     */
    fetchImageErrorCode(mapName, image, generatedDataPath)
    {
        if(!image){
            Logger.critical('File "' + mapName + '.json" must have at least one tileset with an image.');
            return 'mapJsonMissingTilesetImage';
        }
        if(!this.fileNamesValidator.isFileName(image)){
            Logger.critical('File "'+mapName+'.json" tileset image must be a file name without folders.');
            return 'mapTilesetImageInvalidFileName';
        }
        let checkImagePath = FileHandler.joinPaths(generatedDataPath, image);
        if(!FileHandler.exists(checkImagePath)){
            Logger.critical('File "' + checkImagePath + '" not found.');
            return 'mapTilesetImageNotFound';
        }
        return '';
    }

}

module.exports.MapTilesetsImagesValidator = MapTilesetsImagesValidator;
