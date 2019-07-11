/**
 *
 * RoomChat
 *
 * This object room is used for global chat and private chat between users.
 *
 */

const RoomLogin = require('./room-login');
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
        this.activePlayers[client.sessionId] = {id: client.sessionId, username: authResult.username, client: client};
    }

    onMessage(client, data)
    {
        // get player:
        let currentPlayer = this.activePlayers[client.sessionId];
        if(currentPlayer){
            if(data.act === share.CHAT_ACTION){
                // @TODO: validate if user is allowed to use global chat.
                let text = data[share.CHAT_MESSAGE].toString();
                let messageObject = {act: share.CHAT_ACTION, f: currentPlayer.username};
                if(text.indexOf('@') === 0){
                    let to = data[share.CHAT_TO];
                    let clientTo = this.getActivePlayerByName(to);
                    messageObject.m = text.substring(1);
                    this.send(client, messageObject);
                    // use a different color for send:
                    messageObject.m = `<span style="color:#00ffff;">${text.substring(1)}</span>`;
                    this.send(clientTo, messageObject);
                } else if(text.indexOf('#') === 0){
                    messageObject.m = `<span style="color:#ffff00;">${text.substring(1)}</span>`;
                    this.broadcast(messageObject);
                } else {
                    messageObject.m = '<span style="color:#ff0000;">Message not allowed.</span>';
                    messageObject.f = 'System';
                    this.send(client, messageObject);
                }
            }
        }
    }

    onLeave (client, consented)
    {
        let currentPlayer = this.activePlayers[client.sessionId];
        let message = `<span style="color:#ff0000;">${currentPlayer.username} has left.</span>`;
        this.broadcast({act: share.CHAT_ACTION, m: message, f: 'System'});
        delete this.activePlayers[client.sessionId];
    }

    getActivePlayerByName(to)
    {
        let clientTo = false;
        for (let idx in this.activePlayers) {
            let client = this.activePlayers[idx];
            if(client.username === to){
                clientTo = client.client;
                break;
            }
        }
        return clientTo;
    }

}

module.exports = RoomChat;
