/**
 *
 * Reldens - MessagesProcessor
 *
 */

const { ScoresMessageHandler } = require('./scores-message-handler');
const { sc } = require('@reldens/utils');

class MessagesProcessor
{

    static processScoresMessagesQueue(roomEvents, scoresMessageListener)
    {
        if(!sc.isArray(roomEvents.scoresMessagesQueue)){
            return;
        }
        if(0 === roomEvents.scoresMessagesQueue.length){
            return;
        }
        for(let message of roomEvents.scoresMessagesQueue){
            scoresMessageListener.handleScoresMessage(message, new ScoresMessageHandler({roomEvents, message}));
        }
        roomEvents.scoresMessagesQueue = [];
    }

}

module.exports.MessageProcessor = MessagesProcessor;
