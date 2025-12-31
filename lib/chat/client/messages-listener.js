/**
 *
 * Reldens - MessagesListener
 *
 * Listens for chat messages from the server and queues or displays them.
 *
 */

const { ChatConst } = require('../constants');

/**
 * @typedef {import('colyseus.js').Room} ColyseusRoom
 */
class MessagesListener
{

    /**
     * @param {ColyseusRoom} room
     * @param {Object} chatPack
     * @returns {Promise<void>}
     */
    static async listenMessages(room, chatPack)
    {
        room.onMessage('*', (message) => {
            if(ChatConst.CHAT_ACTION !== message.act){
                return;
            }
            if(!chatPack.uiManager){
                chatPack.messagesQueu.push(message);
                return;
            }
            chatPack.uiManager.attachNewMessage(message);
        });
    }

}

module.exports.MessagesListener = MessagesListener;
