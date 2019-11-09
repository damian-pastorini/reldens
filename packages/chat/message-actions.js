/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const ChatManager = require('./manager');
const share = require('./constants');
const utils = require('../utils/constants');

class MessageActions
{

    parseMessageAndRunActions(room, data, playerSchema)
    {
        if(data.act === share.CHAT_ACTION){
            let message = data[share.CHAT_MESSAGE].toString().replace('\\', '');
            let messageData = {act: share.CHAT_ACTION, m: message, f: playerSchema.username, t: share.CHAT_TYPE_NORMAL};
            room.broadcast(messageData);
            ChatManager.saveMessage(message, playerSchema, {}, false).catch((err) => {
                console.log('ERROR - Chat save error:', err);
            });
        }
        if(data.act === utils.CLIENT_JOINED && room.config.get('feature/chat/messages/broadcast_join')){
            let sentText = `${playerSchema.username} has joined ${room.roomName}.`;
            room.broadcast({act: share.CHAT_ACTION, m: sentText, f: 'System', t: share.CHAT_TYPE_SYSTEM});
            ChatManager.saveMessage(room.roomName, playerSchema, false, share.CHAT_JOINED)
                .catch((err) => {
                    console.log('ERROR - Joined room chat save error:', err);
                });
        }
    }

}

module.exports = MessageActions;
