/**
 *
 * Reldens - SampleFileCopier
 *
 * Copies a single sample file from a tile-map-generator package examples folder into the generation root
 * folder, leaving an already present file untouched. It only resolves the examples root and performs the
 * copy, the callers decide which examples folder and which files a maps wizard strategy requires. A name that is not
 * a file name (the composite tilesets images names included) is never copied, so it can not write outside the folder.
 *
 */

const { MapsWizardFileNamesValidator } = require('./maps-wizard-file-names-validator');
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
        /** @type {MapsWizardFileNamesValidator} */
        this.fileNamesValidator = new MapsWizardFileNamesValidator();
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
        if(!this.fileNamesValidator.isFileName(fileName)){
            Logger.error('Sample file not copied, the name must be a file name without folders.', fileName);
            return false;
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
