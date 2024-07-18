/**
 *
 * Reldens - PropertiesHandler
 *
 */

const { Logger } = require('@reldens/utils');

class PropertiesHandler
{

    constructor()
    {
        this.requiredProperties = [];
    }

    validate()
    {
        for(let i of this.requiredProperties){
            if(!this[i]){
                Logger.error('Missing "'+i+'" in "'+this.constructor.name+'".');
                return false;
            }
        }
        return true;
    }

    assignProperties(objectInstance)
    {
        for(let i of this.requiredProperties){
            objectInstance[i] = this[i];
        }
        return objectInstance;
    }

}

module.exports.PropertiesHandler = PropertiesHandler;
