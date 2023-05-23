/**
 *
 * Reldens - ConfigProcessor
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ConfigProcessor
{

    constructor()
    {
        this.avoidLog = false;
    }

    /**
     * This method will receive a path that's should be always composed by 3 or 4 parameters split by a slash and will
     * return a property of the same processor which should have the configurations assigned.
     */
    get(path, defaultValue)
    {
        let defaultReturn = 'undefined' !== typeof defaultValue ? defaultValue : false;
        // since the amount of parameters should be always 3 (for a config group) or 4 (for a single value) then we can
        // easily split the path:
        let pathArray = path.split('/');
        // verify path size:
        if(3 > pathArray.length){
            if(!this.avoidLog){
                Logger.error('Path level is too low:', path);
            }
            return defaultReturn;
        }
        // default value will be always false:
        let levelCheck = (this[pathArray[0]] || {});
        for(let i = 1; i < pathArray.length; i++){
            if(!sc.hasOwn(levelCheck, pathArray[i])){
                if(!this.avoidLog){
                    Logger.error('Configuration level '+i+' > "'+pathArray[i]+'" not defined: '+path, this);
                }
                levelCheck = defaultReturn;
                break;
            }
            levelCheck = levelCheck[pathArray[i]];
        }
        return levelCheck;
    }

    getWithoutLogs(path, defaultValue = false)
    {
        this.avoidLog = true;
        let result = this.get(path, defaultValue);
        this.avoidLog = false;
        return result;
    }

}

module.exports.ConfigProcessor = ConfigProcessor;
