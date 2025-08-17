/**
 *
 * Reldens - MapsLoader
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class MapsLoader
{

    static reloadMaps(themeFolder, configManager)
    {
        if(!themeFolder){
            ErrorManager.error('Theme folder not defined!');
        }
        let mapsFolder = FileHandler.joinPaths('assets', 'maps');
        let mapFolderPath = FileHandler.joinPaths(themeFolder, mapsFolder);
        if(!FileHandler.exists(mapFolderPath)){
            FileHandler.createFolder(mapFolderPath);
            Logger.notice('Maps folder has to be created.');
            return;
        }
        let dirCont = FileHandler.readFolder(mapFolderPath);
        let files = [];
        for(let elm of dirCont){
            if(elm.match(/.*\.(json)/ig)){
                files.push(elm);
            }
        }
        configManager.configList.server.maps = {};
        for(let file of files){
            let fileFullPath = FileHandler.joinPaths(themeFolder, mapsFolder, file);
            let mapKey = file.replace('.json', '');
            let fileContents = FileHandler.readFile(fileFullPath);
            if(!fileContents){
                Logger.error('Load map error.', FileHandler.error.message);
                continue;
            }
            try {
                configManager.configList.server.maps[mapKey] = sc.toJson(fileContents);
            } catch (error) {
                Logger.error('Load map error.', error.message);
            }
        }
    }

}

module.exports.MapsLoader = MapsLoader;
