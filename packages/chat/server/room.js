/**
 *
 * Reldens - RoomChat
 *
 * This object room is used for global chat and private chat between users.
 *
 */

const { RoomLogin } = require('../../rooms/server/login');
const { ChatManager } = require('./manager');
const { Cleaner } = require('./cleaner');
const { ChatConst } = require('../constants');

class RoomChat extends RoomLogin
{

    onCreate(options)
    {
        // parent config:
        super.onCreate(options);
        this.activePlayers = {};
    }

    onJoin(client, options, authResult)
    {
        // we do not need to create a player entity since we only need the name for the chat:
        this.activePlayers[client.sessionId] = {
            id: authResult.id,
            sessionId: client.sessionId,
            username: authResult.username,
            role_id: authResult.role_id,
            playerData: authResult.players[0],
            client: client
        };
    }

    onMessage(client, data)
    {
        // get player:
        let currentActivePlayer = this.activePlayers[client.sessionId];
        if(currentActivePlayer){
            if(data.act === ChatConst.CHAT_ACTION){
                let text = Cleaner.cleanMessage(data[ChatConst.CHAT_MESSAGE]);
                let messageObject = {act: ChatConst.CHAT_ACTION, f: currentActivePlayer.username};
                let clientTo = false;
                let clientToPlayerSchema = false;
                let sentText = 'Message not allowed.';
                let messageType = false;
                if(text.indexOf('@') === 0){
                    let to = data[ChatConst.CHAT_TO];
                    clientTo = this.getActivePlayerByName(to);
                    if(clientTo){
                        clientToPlayerSchema = clientTo.playerData;
                        messageObject.m = text.substring(text.indexOf(' '));
                        messageObject.t = ChatConst.CHAT_TYPE_PRIVATE_FROM;
                        this.send(client, messageObject);
                        messageObject.t = ChatConst.CHAT_TYPE_PRIVATE_TO;
                        this.send(clientTo.client, messageObject);
                    } else {
                        messageObject.m = 'Player not found: '+to;
                        messageObject.f = 'System';
                        messageObject.t = ChatConst.CHAT_TYPE_SYSTEM_ERROR;
                        this.send(client, messageObject);
                        messageType = 's';
                    }
                } else if(text.indexOf('#') === 0){
                    let isGlobalEnabled = this.config.get('feature/chat/messages/global_enabled');
                    let globalAllowedRoles = this.config.get('feature/chat/messages/global_allowed_roles')
                        .split(',')
                        .map(Number);
                    if(isGlobalEnabled && globalAllowedRoles.indexOf(currentActivePlayer.role_id) !== -1){
                        messageObject.m = text.substring(1);
                        messageObject.t = ChatConst.CHAT_TYPE_GLOBAL;
                        this.broadcast(messageObject);
                        messageType = 'g';
                    } else {
                        messageObject.m = 'Global messages not allowed.';
                        messageObject.f = 'System';
                        messageObject.t = ChatConst.CHAT_TYPE_SYSTEM_ERROR;
                        this.send(client, messageObject);
                        messageType = 's';
                    }
                } else {
                    messageObject.m = sentText+' - '+text;
                    messageObject.f = 'System';
                    messageObject.t = ChatConst.CHAT_TYPE_SYSTEM_ERROR;
                    this.send(client, messageObject);
                    messageType = 's';
                }
                ChatManager.saveMessage(sentText, currentActivePlayer.playerData, clientToPlayerSchema, messageType)
                    .catch((err) => {
                        console.log('ERROR - Global chat save error:', err);
                     });
            }
        }
    }

    // eslint-disable-next-line no-unused-vars
    onLeave(client, consented)
    {
        if(this.config.get('feature/chat/messages/broadcast_leave')){
            let currentActivePlayer = this.activePlayers[client.sessionId];
            let sentText = `${currentActivePlayer.username} has left.`;
            this.broadcast({act: ChatConst.CHAT_ACTION, m: sentText, f: 'System', t: ChatConst.CHAT_TYPE_SYSTEM});
        }
        delete this.activePlayers[client.sessionId];
    }

    /**
     * Active players are custom objects with only some properties.
     *
     * @param playerName
     * @returns {boolean}
     */
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

module.exports.RoomChat = RoomChat;
