/**
 *
 * Reldens - MessagesProcessor
 *
 */

const { MessageHandler } = require('./message-handler');
const { sc, Logger} = require('@reldens/utils');

class MessagesProcessor
{

    static processRewardsMessagesQueue(event, rewardsPlugin)
    {
        let roomEvents = event?.roomEvents;
        if(!roomEvents){
            Logger.critical('RoomEvents undefined for process Rewards messages queue on RewardsPlugin.', event);
            return false;
        }
        if(!sc.isArray(roomEvents.rewardsMessagesQueue)){
            return;
        }
        if(0 === roomEvents.rewardsMessagesQueue.length){
            return;
        }
        for(let message of roomEvents.rewardsMessagesQueue){
            rewardsPlugin.messageListener?.handleRewardsMessage(message, new MessageHandler({roomEvents, message}));
        }
        roomEvents.rewardsMessagesQueue = [];
    }

}

module.exports.MessageProcessor = MessagesProcessor;
