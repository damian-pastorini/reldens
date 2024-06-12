/**
 *
 * Reldens - HomepageLoader
 *
 */

const { FileHandler } = require('./file-handler');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class HomepageLoader
{

    static async loadContents(requestLanguage, distPath, initialConfiguration)
    {
        let languageParam = (requestLanguage || '').toString();
        if ('' !== languageParam) {
            if (!sc.isValidIsoCode(languageParam)) {
                Logger.error('Invalid selected language ISO code.');
                languageParam = '';
            }
            Logger.info('Selected language: ' + languageParam);
        }
        let indexPath = FileHandler.joinPaths(distPath, languageParam + '-' + GameConst.STRUCTURE.INDEX);
        let defaultIndexPath = FileHandler.joinPaths(distPath, GameConst.STRUCTURE.INDEX);
        let filePath = '' !== languageParam && FileHandler.exists(indexPath) ? indexPath : defaultIndexPath;
        Logger.info('Loading index: ' + filePath);
        let html = FileHandler.readFile(filePath);
        let configScriptContents = '<script type="text/javascript" id="reldens-initial-config">'
            + 'window.reldensInitialConfig = ' + JSON.stringify(initialConfiguration) + ';'
            + '</script>';
        if(!html){
            Logger.error('File not found: ' + filePath);
            return configScriptContents;
        }
        html = html.replace(
            '<script type="text/javascript" id="reldens-initial-config"></script>',
            configScriptContents
        );
        return html;
    }

}

module.exports.HomepageLoader = HomepageLoader;
