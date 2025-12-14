/**
 *
 * Reldens - MessagesProcessor
 *
 * Processes queued rewards messages that arrived before the UI was ready.
 *
 */

const { MessageHandler } = require('./message-handler');
const { Logger, sc } = require('@reldens/utils');

class MessagesProcessor
{

    /**
     * @param {Object} event
     * @param {Object} rewardsPlugin
     * @returns {boolean}
     */
    static processRewardsMessagesQueue(event, rewardsPlugin)
    {
        // @TODO - BETA - All event listeners should return the mutated event.
        let roomEvents = event?.roomEvents;
        if(!roomEvents){
            Logger.critical('RoomEvents undefined for process Rewards messages queue on RewardsPlugin.', event);
            return false;
        }
        if(!sc.isArray(roomEvents.rewardsMessagesQueue)){
            return false;
        }
        if(0 === roomEvents.rewardsMessagesQueue.length){
            return false;
        }
        for(let message of roomEvents.rewardsMessagesQueue){
            rewardsPlugin.messageListener?.handleRewardsMessage(message, new MessageHandler({roomEvents, message}));
        }
        roomEvents.rewardsMessagesQueue = [];
        return true;
    }

}

module.exports.MessageProcessor = MessagesProcessor;
