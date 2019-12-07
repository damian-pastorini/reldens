/**
 *
 * Reldens - Cleaner
 *
 * Clean chat messages.
 *
 */

class Cleaner
{

    cleanMessage(message)
    {
        return message.toString().replace(/\\/g, '').substr(0, 140);
    }

}

module.exports.Cleaner = new Cleaner();
