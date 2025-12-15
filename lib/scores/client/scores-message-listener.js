/**
 *
 * Reldens - ScoresMessageListener
 *
 * Listens for scores-related messages from the server and delegates handling to the appropriate handler.
 * Queues messages if the UI is not ready yet.
 *
 */

const { ScoresMessageHandler } = require('./scores-message-handler');
const { ScoresConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/client/room-events').RoomEvents} RoomEvents
 */
class ScoresMessageListener
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on ScoresMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on ScoresMessageListener.', props);
            return false;
        }
        let scoresMessageHandler = new ScoresMessageHandler({roomEvents, message});
        if(!scoresMessageHandler.validate()){
            if(this.isScoresMessage(message)){
                if(!roomEvents.scoresMessagesQueue){
                    roomEvents.scoresMessagesQueue = [];
                }
                roomEvents.scoresMessagesQueue.push(message);
                return true;
            }
            Logger.error('Invalid ScoresMessageHandler', scoresMessageHandler);
            return false;
        }
        if(!this.isScoresMessage(message)){
            return false;
        }
        return this.handleScoresMessage(message, scoresMessageHandler);
    }

    /**
     * @param {Object} message
     * @param {ScoresMessageHandler} scoresMessageHandler
     * @returns {boolean|void}
     */
    handleScoresMessage(message, scoresMessageHandler)
    {
        if(ScoresConst.ACTIONS.UPDATE === message.act){
            return scoresMessageHandler.updatePlayerScore();
        }
        if(ScoresConst.ACTIONS.TOP_SCORES_UPDATE === message.act){
            return scoresMessageHandler.updateScoresBox();
        }
        return true;
    }

    /**
     * @param {Object} message
     * @returns {boolean}
     */
    isScoresMessage(message)
    {
        return 0 === message.act?.indexOf(ScoresConst.PREFIX);
    }
}

module.exports.ScoresMessageListener = ScoresMessageListener;
