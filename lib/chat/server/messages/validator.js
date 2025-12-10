/**
 *
 * Reldens - Validator
 *
 * Validates chat message objects have required properties.
 *
 */

const { Logger } = require('@reldens/utils');

class Validator
{

    /**
     * @param {Object} message
     * @param {Array<string>} props
     * @returns {boolean}
     */
    static validateMessage(message, props)
    {
        if(!message){
            Logger.critical('Invalid message');
            return false;
        }
        for(let prop of props){
            if(!message[prop]){
                Logger.critical('Missing message property: '+prop);
                return false;
            }
        }
        return true;
    }

}

module.exports.Validator = Validator;
