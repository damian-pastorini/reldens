/**
 *
 * Reldens - HomepageLoader
 *
 * Static utility class for loading and serving the game homepage (index.html) with multi-language
 * support. Handles language-specific index file selection (e.g., es-index.html, fr-index.html),
 * validates ISO language codes, and generates the client-side configuration file (config.js) with
 * initial game settings. Used by Express routes to serve the dynamic game entry point.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class HomepageLoader
{

    /**
     * @param {string} requestLanguage
     * @param {string} distPath
     * @returns {Promise<string>}
     */
    static async loadContents(requestLanguage, distPath)
    {
        let languageParam = (requestLanguage || '').toString();
        if('' !== languageParam){
            if(!sc.isValidIsoCode(languageParam)){
                Logger.error('Invalid selected language ISO code.');
                languageParam = '';
            }
            Logger.info('Selected language: '+languageParam);
        }
        let indexPath = FileHandler.joinPaths(distPath, languageParam+'-'+GameConst.STRUCTURE.INDEX);
        let defaultIndexPath = FileHandler.joinPaths(distPath, GameConst.STRUCTURE.INDEX);
        let filePath = '' !== languageParam && FileHandler.exists(indexPath) ? indexPath : defaultIndexPath;
        Logger.info('Loading index: '+filePath);
        let html = FileHandler.readFile(filePath);
        if(!html){
            Logger.error('No index file found.', FileHandler.error);
            return '';
        }
        return html;
    }

    /**
     * @param {string} projectThemePath
     * @param {Object<string, any>} initialConfiguration
     * @returns {boolean}
     */
    static createConfigFile(projectThemePath, initialConfiguration)
    {
        let configFilePath = FileHandler.joinPaths(projectThemePath, 'config.js');
        let configFileContents = 'window.reldensInitialConfig = '+JSON.stringify(initialConfiguration)+';';
        let writeResult = FileHandler.writeFile(configFilePath, configFileContents);
        if(!writeResult){
            Logger.error('Failed to write config file: '+configFilePath);
            return false;
        }
        Logger.info('Config file created: '+configFilePath);
        return true;
    }

}

module.exports.HomepageLoader = HomepageLoader;
