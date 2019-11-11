/**
 *
 * Reldens - ErrorManager
 *
 * This module handle all the game errors.
 *
 */

class ErrorManager
{

    error(message)
    {
        throw new Error('ERROR - ' + message);
    }

}

module.exports.ErrorManager = new ErrorManager();