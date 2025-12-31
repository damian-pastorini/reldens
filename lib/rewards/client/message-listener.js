/**
 *
 * Reldens - MessageListener
 *
 * Listens for rewards-related client messages and routes them to the appropriate message handler.
 *
 */

const { MessageHandler } = require('./message-handler');
const { RewardsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class MessageListener
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on RewardsMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on RewardsMessageListener.', props);
            return false;
        }
        if(!this.isRewardsMessage(message)){
            return false;
        }
        let messageHandler = new MessageHandler({roomEvents, message});
        if(!messageHandler.validate()){
            if(!roomEvents.rewardsMessagesQueue){
                roomEvents.rewardsMessagesQueue = [];
            }
            roomEvents.rewardsMessagesQueue.push(message);
            return true;
        }
        return this.handleRewardsMessage(message, messageHandler);
    }

    /**
     * @param {Object} message
     * @param {MessageHandler} messageHandler
     * @returns {boolean}
     */
    handleRewardsMessage(message, messageHandler)
    {
        if(RewardsConst.ACTIONS.UPDATE === message.act){
            return messageHandler.updateRewardsBox();
        }
        if(RewardsConst.ACTIONS.ACCEPTED_REWARD === message.act){
            return messageHandler.showAcceptedReward();
        }
        return true;
    }

    /**
     * @param {Object} message
     * @returns {boolean}
     */
    isRewardsMessage(message)
    {
        return 0 === message.act?.indexOf(RewardsConst.PREFIX);
    }
}

module.exports.MessageListener = MessageListener;
