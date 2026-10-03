/**
 *
 * Reldens - LayerElementsSampleFilesProvider
 *
 * Resolves the files the layer elements object loader strategy requires, the one element file per element key
 * declared in "layerElementsFiles" and the tile sheet image declared in "tileSheetPath", by copying whichever
 * of them is missing from the generation root folder out of the tile-map-generator package examples.
 *
 * Without them the loader produces a map with zero elements and the tile sheet copy fails at the end of the
 * generation, which the wizard could only report as a generic "maps not generated" error.
 *
 */

const { SampleFileCopier } = require('./sample-file-copier');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/theme-manager').ThemeManager} ThemeManager
 */
class LayerElementsSampleFilesProvider
{

    /**
     * @param {ThemeManager} themeManager
     */
    constructor(themeManager)
    {
        this.sampleFileCopier = new SampleFileCopier(themeManager);
        this.packageExamplesPath = FileHandler.joinPaths(
            this.sampleFileCopier.examplesPath,
            'layer-elements-object'
        );
    }

    /**
     * @param {string} rootFolder
     * @param {Object} mapData
     * @returns {boolean}
     */
    ensureLayerElementsFiles(rootFolder, mapData)
    {
        let layerElementsFiles = sc.get(mapData, 'layerElementsFiles', {});
        let elementKeys = Object.keys(layerElementsFiles);
        if(0 === elementKeys.length){
            return true;
        }
        let ensuredFiles = this.sampleFileCopier.copy(
            this.packageExamplesPath,
            rootFolder,
            String(sc.get(mapData, 'tileSheetPath', ''))
        );
        for(let elementKey of elementKeys){
            if(!this.sampleFileCopier.copy(this.packageExamplesPath, rootFolder, layerElementsFiles[elementKey])){
                ensuredFiles = false;
            }
        }
        return ensuredFiles;
    }

}

module.exports.LayerElementsSampleFilesProvider = LayerElementsSampleFilesProvider;
