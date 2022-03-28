/**
 *
 * Reldens - Cleaner
 *
 * Clean chat messages.
 *
 */

class Cleaner
{

    cleanMessage(message, characterLimit)
    {
        // @TODO - BETA - Implement any clean feature here.
        let text = message.toString().replace(/\\/g, '');
        if(0 < characterLimit){
            return text.substring(0, characterLimit);
        }
        return text;
    }

}

module.exports.Cleaner = new Cleaner();
