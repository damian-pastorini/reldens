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
        // @TODO: implement a configured validation to know which messages should be logged and a notifications system.
        console.log('INFO -', data);
    }

    error(data)
    {
        console.log('ERROR -', data);
    }

}

module.exports.Logger = new Logger();
