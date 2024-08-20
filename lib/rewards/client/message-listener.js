/**
 *
 * Reldens - MessageListener
 *
 */

const { MessageHandler } = require('./message-handler');
const { RewardsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class MessageListener
{

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
            console.log(message);
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

    isRewardsMessage(message)
    {
        return 0 === message.act?.indexOf(RewardsConst.PREFIX);
    }
}

module.exports.MessageListener = MessageListener;
