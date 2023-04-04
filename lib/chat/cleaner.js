/**
 *
 * Reldens - Cleaner
 *
 */

const { sc } = require('@reldens/utils');

class Cleaner
{

    cleanMessage(message, characterLimit)
    {
        // @TODO - BETA - Implement any clean feature here.
        return sc.cleanMessage(message, characterLimit);
    }

}

module.exports.Cleaner = new Cleaner();
