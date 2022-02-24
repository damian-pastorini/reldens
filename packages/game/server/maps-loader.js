/**
 *
 * Reldens - MapsLoader
 *
 * This module is the only one with a dynamic require and only handles that.
 * It loads all the maps in the server side at once.
 *
 */

const fs = require('fs');
const path = require('path');
const { ErrorManager, Logger } = require('@reldens/utils');

class MapsLoader
{

    static loadMaps(themeFolder, configManager)
    {
        if(!themeFolder){
            ErrorManager.error('Theme folder not defined!');
        }
        let mapsFolder = path.join('assets', 'maps');
        let dirCont = fs.readdirSync(path.join(themeFolder, mapsFolder));
        let files = dirCont.filter(function(elm){
            return elm.match(/.*\.(json)/ig);
        });
        configManager.configList.server.maps = {};
        for(let file of files){
            let fileFullPath = path.join(themeFolder, mapsFolder, file);
            let mapKey = file.replace('.json', '');
            try {
                configManager.configList.server.maps[mapKey] = JSON.parse(fs.readFileSync(fileFullPath, 'utf8'));
            } catch (error) {
                Logger.error('Load map error.', error.message);
            }
        }
    }

}

module.exports.MapsLoader = MapsLoader;
