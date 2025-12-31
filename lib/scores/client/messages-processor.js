/**
 *
 * Reldens - MessagesProcessor
 *
 * Processes queued scores messages when the UI scene becomes ready.
 *
 */

const { ScoresMessageHandler } = require('./scores-message-handler');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('./scores-message-listener').ScoresMessageListener} ScoresMessageListener
 */
class MessagesProcessor
{

    /**
     * @param {RoomEvents} roomEvents
     * @param {ScoresMessageListener} scoresMessageListener
     */
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
