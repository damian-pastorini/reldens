/**
 *
 * Reldens - PropertiesHandler
 *
 * Base utility class for validating and managing required properties on objects. Provides methods to
 * validate that all required properties are set (validate), and to copy properties from this instance
 * to another object (assignProperties). Designed to be extended by classes that need property validation.
 *
 */

const { Logger } = require('@reldens/utils');

class PropertiesHandler
{

    constructor()
    {
        /** @type {Array<string>} */
        this.requiredProperties = [];
    }

    /**
     * @returns {boolean}
     */
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

    /**
     * @param {object} objectInstance
     * @returns {object}
     */
    assignProperties(objectInstance)
    {
        for(let i of this.requiredProperties){
            objectInstance[i] = this[i];
        }
        return objectInstance;
    }

}

module.exports.PropertiesHandler = PropertiesHandler;
