/**
 *
 * Reldens - SampleFileCopier
 *
 * Copies a single sample file from a tile-map-generator package examples folder into the generation root
 * folder, leaving an already present file untouched. It only resolves the examples root and performs the
 * copy, the callers decide which examples folder and which files a maps wizard strategy requires.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/theme-manager').ThemeManager} ThemeManager
 */
class SampleFileCopier
{

    /**
     * @param {ThemeManager} themeManager
     */
    constructor(themeManager)
    {
        this.examplesPath = FileHandler.joinPaths(
            themeManager.projectRoot,
            'node_modules',
            '@reldens',
            'tile-map-generator',
            'examples'
        );
    }

    /**
     * @param {string} sourceFolder
     * @param {string} rootFolder
     * @param {string} fileName
     * @returns {boolean}
     */
    copy(sourceFolder, rootFolder, fileName)
    {
        if('' === fileName){
            return true;
        }
        if(FileHandler.exists(FileHandler.joinPaths(rootFolder, fileName))){
            return true;
        }
        FileHandler.createFolder(rootFolder);
        if(!FileHandler.copyFile(
            FileHandler.joinPaths(sourceFolder, fileName),
            FileHandler.joinPaths(rootFolder, fileName)
        )){
            Logger.error('Sample file could not be copied: '+fileName, sourceFolder, rootFolder);
            return false;
        }
        Logger.info('Sample file copied for reuse: '+fileName, rootFolder);
        return true;
    }

}

module.exports.SampleFileCopier = SampleFileCopier;
