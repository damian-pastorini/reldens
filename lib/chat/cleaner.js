/**
 *
 * Reldens - Cleaner
 *
 * Cleans the player text before it is broadcast or stored: no string gives an empty text, and the markup characters are
 * removed before the length limit, so no player text is stored as HTML.
 *
 */

const { ChatConst } = require('./constants');
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
        return sc.isString(message)
            ? sc.cleanMessage(message.replace(ChatConst.MARKUP_CHARACTERS, ''), characterLimit)
            : '';
    }

}

module.exports.Cleaner = new Cleaner();
