/**
 *
 * Reldens - MapsLoader
 *
 */

const fs = require('fs');
const path = require('path');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class MapsLoader
{

    static reloadMaps(themeFolder, configManager)
    {
        if(!themeFolder){
            ErrorManager.error('Theme folder not defined!');
        }
        let mapsFolder = path.join('assets', 'maps');
        let mapFolderPath = path.join(themeFolder, mapsFolder);
        if(!fs.existsSync(mapFolderPath)){
            fs.mkdirSync(mapFolderPath);
            Logger.notice('Maps folder has to be created.');
            return;
        }
        let dirCont = fs.readdirSync(mapFolderPath);
        let files = dirCont.filter(function(elm){
            return elm.match(/.*\.(json)/ig);
        });
        configManager.configList.server.maps = {};
        for(let file of files){
            let fileFullPath = path.join(themeFolder, mapsFolder, file);
            let mapKey = file.replace('.json', '');
            try {
                configManager.configList.server.maps[mapKey] = sc.toJson(
                    fs.readFileSync(fileFullPath, {encoding: process.env.RELDENS_DEFAULT_ENCODING || 'utf8'})
                );
            } catch (error) {
                Logger.error('Load map error.', error.message);
            }
        }
    }

}

module.exports.MapsLoader = MapsLoader;
