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
        // verify path size:
        if(pathArray.length >= 3){
            let levelCheck = (this[pathArray[0]] || {});
            for(let i = 1; i < pathArray.length; i++){
                if(!sc.hasOwn(levelCheck, pathArray[i])){
                    if(!avoidLog){
                        Logger.error('Configuration level '+i+' not defined: '+path);
                    }
                    levelCheck = false;
                    break;
                }
                levelCheck = levelCheck[pathArray[i]];
            }
            result = levelCheck;
        } else {
            if(!avoidLog){
                Logger.error('Path level is too low:', path);
            }
        }
        return result;
    }

}

module.exports.ConfigProcessor = new ConfigProcessor();
