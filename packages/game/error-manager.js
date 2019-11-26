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
        // @TODO: evaluate better ways to handle errors, implement email notifications, etc.
        throw new Error(message);
    }

}

module.exports.ErrorManager = new ErrorManager();