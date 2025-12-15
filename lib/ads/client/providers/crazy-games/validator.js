/**
 *
 * Reldens - Validator
 *
 * Validates the required properties for ad activation in the CrazyGames SDK.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class Validator
{

    /**
     * @param {Object} props
     * @returns {boolean}
     */
    validate(props)
    {
        if(!props.gameManager){
            Logger.error('Missing Game Manager on Validator.', props);
            return false;
        }
        if(!props.sdk){
            Logger.error('Missing SDK on Validator.', props);
            return false;
        }
        if(!props.hasAdblock || !sc.isFunction(props.hasAdblock)){
            Logger.warning('Missing or invalid hasAdblock function on Validator.', props);
        }
        if(!props.isEnabled || !sc.isFunction(props.isEnabled)){
            Logger.error('Missing or invalid isEnabled function on Validator.', props);
            return false;
        }
        return true;
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async canBeActivated(props)
    {
        if(!sc.isFunction(props.hasAdblock) || await props.hasAdblock()){
            Logger.info('AdBlocker detected.');
            return false;
        }
        return true;
    }

}

module.exports.Validator = Validator;
