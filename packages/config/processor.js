/**
 *
 * Reldens - ConfigProcessor
 *
 * Helper class to validate and get the configurations. This class is used in both sides, server and client.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ConfigProcessor
{

    /**
     * This method will receive a path that's should be always composed by 3 or 4 parameters split by a slash and will
     * return a property of the same processor which should have the configurations assigned.
     */
    get(path, avoidLog = false)
    {
        // default value will be always false:
        let result = false;
        // since the amount of parameters should be always 3 (for a config group) or 4 (for a single value) then we can
        // easily split the path:
        let pathArray = path.split('/');
        // if the path length is 3 then we need to return a full group of configurations:
        if(pathArray.length === 3){
            let level1 = ((this[pathArray[0]] || {})[pathArray[1]] || {});
            if(sc.hasOwn(level1, pathArray[2])){
                result = level1[pathArray[2]];
            } else {
                if(!avoidLog){
                    Logger.error('Configuration level 3 not defined: '+path);
                }
            }
        }
        // is the path length is 4 then we return a single value:
        if(pathArray.length === 4){
            let level2 = (((this[pathArray[0]] || {})[pathArray[1]] || {})[pathArray[2]] || {});
            if(sc.hasOwn(level2, pathArray[3])){
                result = level2[pathArray[3]];
            } else {
                if(!avoidLog){
                    Logger.error('Configuration level 4 not defined: '+path);
                }
            }
        }
        if(pathArray.length !== 3 && pathArray.length !== 4){
            Logger.error('Configuration wrong path length: '+pathArray.length);
        }
        return result;
    }

}

module.exports.ConfigProcessor = new ConfigProcessor();
