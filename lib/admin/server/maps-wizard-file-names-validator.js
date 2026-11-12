/**
 *
 * Reldens - MapsWizardFileNamesValidator
 *
 * Validates the names the maps wizard generator data joins into the server files paths: the map, map file, tile
 * sheet, composite and layer elements files names, and the maps names of the multiple maps strategies. A name is valid
 * only when it is its own file base name, so the request can not read, copy or write files outside the generation
 * folders. The sample files providers check the names they copy with it too, since the composite files list more.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class MapsWizardFileNamesValidator
{

    constructor()
    {
        /** @type {Array<string>} */
        this.fileNameKeys = ['mapName', 'mapFileName', 'tileSheetName', 'tileSheetPath', 'compositeElementsFile'];
    }

    /**
     * @param {any} name
     * @returns {boolean}
     */
    isFileName(name)
    {
        return sc.isString(name) && '..' !== name && name === FileHandler.getFileName(name);
    }

    /**
     * @param {Object} mapData
     * @returns {Array<any>}
     */
    fetchFileNames(mapData)
    {
        let fileNames = [];
        for(let fileNameKey of this.fileNameKeys){
            if(sc.hasOwn(mapData, fileNameKey)){
                fileNames.push(mapData[fileNameKey]);
            }
        }
        let layerElementsFiles = sc.get(mapData, 'layerElementsFiles', {});
        if(sc.isObject(layerElementsFiles)){
            for(let elementKey of Object.keys(layerElementsFiles)){
                fileNames.push(layerElementsFiles[elementKey]);
            }
        }
        let mapNames = sc.get(mapData, 'mapNames', []);
        if(sc.isArray(mapNames)){
            fileNames.push(...mapNames);
        }
        let mapsInformation = sc.get(mapData, 'mapsInformation', []);
        if(sc.isArray(mapsInformation)){
            for(let mapInformation of mapsInformation){
                fileNames.push(sc.get(mapInformation, 'mapName', ''));
            }
        }
        return fileNames;
    }

    /**
     * @param {Object} mapData
     * @returns {boolean}
     */
    hasOnlyFileNames(mapData)
    {
        for(let fileName of this.fetchFileNames(mapData)){
            if(!this.isFileName(fileName)){
                Logger.error('Invalid maps wizard file name, it must be a file name without folders.', fileName);
                return false;
            }
        }
        return true;
    }

}

module.exports.MapsWizardFileNamesValidator = MapsWizardFileNamesValidator;
