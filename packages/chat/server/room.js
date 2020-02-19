/**
 *
 * Reldens - RoomChat
 *
 * This object room is used for global chat and private chat between users.
 *
 */

const { RoomLogin } = require('../../rooms/server/login');
const { ChatManager } = require('./manager');
const { Cleaner } = require('../cleaner');
const { ErrorManager } = require('../../game/error-manager');
const { Logger } = require('../../game/logger');
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
        if(data.act !== ChatConst.CHAT_ACTION){
            // do nothing if it's not a chat message:
            return;
        }
        let text = Cleaner.cleanMessage(data[ChatConst.CHAT_MESSAGE]);
        if(
            text.replace('#', '').trim().length === 0
            // do not count the player name on private messages:
            || (text.indexOf('@') !== -1 && text.substr(text.indexOf(' ')).trim().length === 0)
        ){
            // do nothing if text is short than 3 characters (including @ and #):
            return;
        }
        // get player:
        let activePlayer = this.activePlayers[client.sessionId];
        if(!activePlayer){
            // throw error if player does not exists:
            ErrorManager.error('Current Active Player not found: '+client.sessionId);
        }
        let messageObject = {act: ChatConst.CHAT_ACTION, f: activePlayer.username};
        if(text.indexOf('@') === 0){
            this.sendPrivateMessage(client, data[ChatConst.CHAT_TO], text, messageObject, activePlayer.playerData);
        } else if(text.indexOf('#') === 0){
            this.sendGlobalMessage(client, text, messageObject, activePlayer.playerData, activePlayer.role_id);
        }
    }

    sendPrivateMessage(client, toPlayer, text, messageObject, playerData)
    {
        let clientTo = this.getActivePlayerByName(toPlayer);
        let messageType = false;
        let clientToData = false;
        if(clientTo){
            // send message to each client:
            clientToData = clientTo.playerData;
            messageObject.m = text.substring(text.indexOf(' '));
            messageObject.t = ChatConst.CHAT_TYPE_PRIVATE_FROM;
            this.send(client, messageObject);
            messageObject.t = ChatConst.CHAT_TYPE_PRIVATE_TO;
            this.send(clientTo.client, messageObject);
        } else {
            let errorMessage = 'Private chat player not found '+toPlayer;
            this.sendErrorMessage(client, messageObject, errorMessage);
            messageType = 's';
        }
        ChatManager.saveMessage(messageObject.m, playerData.id, playerData.state.room_id, clientToData, messageType)
            .catch((err) => {
                Logger.error('Private chat save error:', err);
            });
    }

    sendGlobalMessage(client, text, messageObject, playerData, roleId)
    {
        let messageType = false;
        let isGlobalEnabled = this.config.get('server/chat/messages/global_enabled');
        let globalAllowedRoles = this.config.get('server/chat/messages/global_allowed_roles')
            .split(',')
            .map(Number);
        if(isGlobalEnabled && globalAllowedRoles.indexOf(roleId) !== -1){
            messageObject.m = text.substring(1);
            messageObject.t = ChatConst.CHAT_TYPE_GLOBAL;
            this.broadcast(messageObject);
            messageType = 'g';
        } else {
            let errorMessage = 'Global messages not allowed.';
            this.sendErrorMessage(client, messageObject, errorMessage);
            messageType = 's';
        }
        ChatManager.saveMessage(messageObject.m, playerData.id, playerData.state.room_id, false, messageType)
            .catch((err) => {
                Logger.error('Global chat save error:', err);
            });
    }

    sendErrorMessage(client, messageObject, message)
    {
        messageObject.m = message;
        messageObject.f = 'System';
        messageObject.t = ChatConst.CHAT_TYPE_SYSTEM_ERROR;
        this.send(client, messageObject);
    }

    // eslint-disable-next-line no-unused-vars
    onLeave(client, consented)
    {
        if(this.config.get('server/chat/messages/broadcast_leave')){
            let activePlayer = this.activePlayers[client.sessionId];
            let sentText = `${activePlayer.username} has left.`;
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
        for(let idx in this.activePlayers){
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
