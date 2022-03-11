/**
 *
 * Reldens - MessagesListener
 *
 */

const { ChatConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class MessagesListener
{

    static async listenMessages(room, chatPack)
    {
        room.onMessage((message) => {
            if(message.act !== ChatConst.CHAT_ACTION){
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
