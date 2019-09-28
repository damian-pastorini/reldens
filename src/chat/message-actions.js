/**
 *
 * Reldens - MessageActions
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
            let messageData = {act: share.CHAT_ACTION, m: message, f: playerSchema.username};
            room.broadcast(messageData);
            ChatManager.saveMessage(message, playerSchema, room.sceneId, {}, false).catch((err) => {
                console.log('ERROR - Chat save error:', err);
            });
        }
        if(data.act === utils.CLIENT_JOINED && room.config.get('feature/chat/messages/broadcast_join')){
            // @TODO: remove HTML from here, we will send a message type to the client to modify the display.
            let sentText = `${playerSchema.username} has joined ${room.roomName}.`;
            let message = `<span style="color:#0fffaa;">${sentText}</span>`;
            room.broadcast({act: share.CHAT_ACTION, m: message, f: 'System'});
            ChatManager.saveMessage(room.roomName, playerSchema, room.sceneId, false, share.CHAT_JOINED)
                .catch((err) => {
                    console.log('ERROR - Joined room chat save error:', err);
                });
        }
    }

}

module.exports = MessageActions;
