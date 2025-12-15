/**
 *
 * Reldens - Cleaner
 *
 * Handles chat message cleaning and validation.
 *
 */

const { sc } = require('@reldens/utils');

class Cleaner
{

    /**
     * @param {string} message
     * @param {number} characterLimit
     * @returns {string}
     */
    cleanMessage(message, characterLimit)
    {
        // @TODO - BETA - Implement any clean feature here.
        return sc.cleanMessage(message, characterLimit);
    }

}

module.exports.Cleaner = new Cleaner();
