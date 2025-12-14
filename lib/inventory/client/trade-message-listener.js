/**
 *
 * Reldens - TradeMessageListener
 *
 * Listens for and processes trade-related messages from the server.
 * Delegates message handling to TradeMessageHandler.
 *
 */

const { TradeMessageHandler } = require('./trade-message-handler');
const { Logger, sc } = require('@reldens/utils');

class TradeMessageListener
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean|void>}
     */
    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on TradeMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on TradeMessageListener.', props);
            return false;
        }
        let tradeMessageHandler = new TradeMessageHandler({roomEvents, message});
        tradeMessageHandler.updateContents();
        return true;
    }

}

module.exports.TradeMessageListener = TradeMessageListener;
