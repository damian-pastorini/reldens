/**
 *
 * RoomChat
 *
 * This object room is used for global chat and private chat between users.
 *
 */

const RoomLogin = require('./room-login');
const ChatHelper = require('./chat-helper');
const share = require('../../shared/constants');

class RoomChat extends RoomLogin
{

    onInit(options)
    {
        this.activePlayers = {};
    }

    onJoin(client, options, authResult)
    {
        // we do not need to create a player entity since we only need the name for the chat:
        this.activePlayers[client.sessionId] = {
            id: authResult.id,
            sessionId: client.sessionId,
            username: authResult.username,
            client: client
        };
        this.chatHelper = new ChatHelper;
    }

    onMessage(client, data)
    {
        // get player:
        let currentActivePlayer = this.activePlayers[client.sessionId];
        if(currentActivePlayer){
            if(data.act === share.CHAT_ACTION){
                // @TODO: validate if user is allowed to use global chat.
                let text = data[share.CHAT_MESSAGE].toString().replace('\\', '');
                let messageObject = {act: share.CHAT_ACTION, f: currentActivePlayer.username};
                let clientTo = false;
                let sentText = 'Message not allowed.';
                let messageType = false;
                if(text.indexOf('@') === 0){
                    let to = data[share.CHAT_TO];
                    clientTo = this.getActivePlayerByName(to);
                    sentText = text.substring(text.indexOf(' '));
                    messageObject.m = `<span style="color:#00f0f0;">${sentText}</span>`;
                    this.send(client, messageObject);
                    // use a different color for send:
                    messageObject.m = `<span style="color:#00ffff;">${sentText}</span>`;
                    this.send(clientTo.client, messageObject);
                } else if(text.indexOf('#') === 0){
                    sentText = text.substring(1);
                    messageObject.m = `<span style="color:#ffff00;">${sentText}</span>`;
                    this.broadcast(messageObject);
                    messageType = 'g';
                } else {
                    sentText = sentText+' - '+text;
                    messageObject.m = `<span style="color:#ff0000;">${sentText}</span>`;
                    messageObject.f = 'System';
                    this.send(client, messageObject);
                    messageType = 's';
                }
                this.chatHelper.saveMessage(sentText, currentActivePlayer, false, clientTo, messageType);
            }
        }
    }

    onLeave (client, consented)
    {
        let currentActivePlayer = this.activePlayers[client.sessionId];
        let message = `<span style="color:#ff0000;">${currentActivePlayer.username} has left.</span>`;
        this.broadcast({act: share.CHAT_ACTION, m: message, f: 'System'});
        delete this.activePlayers[client.sessionId];
    }

    getActivePlayerByName(playerName)
    {
        let clientTo = false;
        for (let idx in this.activePlayers) {
            let client = this.activePlayers[idx];
            if(client.username === playerName){
                clientTo = client;
                break;
            }
        }
        return clientTo;
    }

}

module.exports = RoomChat;
