/**
 *
 * Reldens - TradeMessageListener
 *
 */

const { TradeMessageHandler } = require('./trade-message-handler');
const { Logger, sc } = require('@reldens/utils');

class TradeMessageListener
{

    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents.', props);
            return false;
        }
        let tradeMessageHandler = new TradeMessageHandler({roomEvents, message});
        tradeMessageHandler.updateContents();
    }

}

module.exports.TradeMessageListener = TradeMessageListener;