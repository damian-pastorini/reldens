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

    get(path, defaultValue)
    {
        let defaultReturn = 'undefined' !== typeof defaultValue ? defaultValue : false;
        let pathArray = path.split('/');
        if(2 > pathArray.length){
            if(!this.avoidLog){
                Logger.error('Path level is too low:', path);
            }
            return defaultReturn;
        }
        let levelCheck = (this[pathArray[0]] || {});
        for(let i = 1; i < pathArray.length; i++){
            if(!sc.hasOwn(levelCheck, pathArray[i])){
                if(!this.avoidLog){
                    Logger.error('Configuration level '+i+' > "'+pathArray[i]+'" not defined: '+path);
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
