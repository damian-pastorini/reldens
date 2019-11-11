/**
 *
 * Reldens - Logger
 *
 * This is a general logger handle.
 *
 */

class Logger
{

    info(data)
    {
        console.log('INFO -', data);
    }

    error(data)
    {
        console.log('ERROR -', data);
    }

}

module.exports.Logger = new Logger();
