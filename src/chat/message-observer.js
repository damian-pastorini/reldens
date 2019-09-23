const ChatManager = require('./manager');
const share = require('./constants');
const utils = require('../utils/constants');

class MessageObserver
{

    parseMessageAndRunActions(room, data, playerSchema)
    {
        this.room = room;
        if(data.act === share.CHAT_ACTION){
            let message = data[share.CHAT_MESSAGE].toString().replace('\\', '');
            let messageData = {act: share.CHAT_ACTION, m: message, f: playerSchema.username};
            this.room.broadcast(messageData);
            ChatManager.saveMessage(message, playerSchema, this.room.sceneId, {}, false).catch((err) => {
                console.log('ERROR - Chat save error:', err);
            });
        }
        if(data.act === utils.CLIENT_JOINED){
            // @TODO: broadcast message of players joining rooms will be part of the configuration in the database.
            let sentText = `${playerSchema.username} has joined ${this.room.roomName}.`;
            let message = `<span style="color:#0fffaa;">${sentText}</span>`;
            this.room.broadcast({act: share.CHAT_ACTION, m: message, f: 'System'});
            ChatManager.saveMessage(this.room.roomName, playerSchema, this.room.sceneId, false, share.CHAT_JOINED).catch((err) => {
                console.log('ERROR - Joined room chat save error:', err);
            });
        }
    }

}

module.exports = MessageObserver;
