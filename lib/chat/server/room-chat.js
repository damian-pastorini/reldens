/**
 *
 * Reldens - RoomChat
 *
 */

const { RoomLogin } = require('../../rooms/server/login');
const { ChatManager } = require('./manager');
const { Cleaner } = require('../cleaner');
const { ChatConst } = require('../constants');
const { Logger, ErrorManager, sc } = require('@reldens/utils');

class RoomChat extends RoomLogin
{

    onCreate(props)
    {
        super.onCreate(props);
        this.roomType = ChatConst.ROOM_TYPE_CHAT;
        Logger.info('Created RoomChat: '+this.roomName+' - ID: '+this.roomId+' - Type: '+ChatConst.ROOM_TYPE_CHAT);
        let dataServer = sc.get(this, 'dataServer', false);
        if(!dataServer){
            Logger.error('DataServer undefined in RoomChat.');
        }
        this.chatManager = new ChatManager({dataServer: this.dataServer});
        this.activePlayers = {};
    }

    onJoin(client, props, userModel)
    {
        // we do not need to create a player entity since we only need the name for the chat:
        this.activePlayers[client.sessionId] = {
            id: userModel.id,
            sessionId: client.sessionId,
            playerName: userModel.player.name,
            role_id: userModel.role_id,
            playerData: userModel.player,
            client: client
        };
    }

    handleReceivedMessage(client, data)
    {
        if(data.act !== ChatConst.CHAT_ACTION){
            return;
        }
        let text = Cleaner.cleanMessage(
            data[ChatConst.MESSAGE.KEY],
            this.config.get('client/chat/messages/characterLimit')
        );
        if(
            0 === text.replace('#', '').trim().length
            // do not count the player name on private messages:
            || -1 !== (text.indexOf('@') && 0 === text.substring(text.indexOf(' ')).trim().length)
        ){
            // do nothing if text is shorter than 3 characters (including @ and #):
            return;
        }
        let activePlayer = this.activePlayers[client.sessionId];
        if(!activePlayer){
            // throw error if player do not exist:
            ErrorManager.error('Current Active Player not found: '+client.sessionId);
        }
        let messageObject = {act: ChatConst.CHAT_ACTION, f: activePlayer.playerName};
        if(0 === text.indexOf('@')){
            return this.sendPrivateMessage(client, data[ChatConst.CHAT_TO], text, messageObject, activePlayer.playerData);
        }
        if(0 === text.indexOf('#')){
            return this.sendGlobalMessage(client, text, messageObject, activePlayer.playerData, activePlayer.role_id);
        }
    }

    sendPrivateMessage(client, toPlayer, text, messageObject, playerData)
    {
        if(!toPlayer){
            return false;
        }
        let clientTo = this.getActivePlayerByName(toPlayer);
        let messageType = ChatConst.TYPES.PRIVATE;
        let clientToData = false;
        if(!clientTo){
            let errorMessage = 'Private chat player not found '+toPlayer;
            return this.sendErrorMessage(client, messageObject, errorMessage);
        }
        clientToData = clientTo.playerData;
        messageObject.m = text.substring(text.indexOf(' '));
        messageObject.t = ChatConst.CHAT_TYPE_PRIVATE_FROM;
        client.send('*', messageObject);
        messageObject.t = ChatConst.CHAT_TYPE_PRIVATE_TO;
        clientTo.client.send('*', messageObject);
        this.chatManager.saveMessage(
            messageObject.m,
            playerData.id,
            playerData.state.room_id,
            clientToData,
            messageType
        ).catch((err) => {
            Logger.error('Private chat save error:', err);
        });
    }

    sendGlobalMessage(client, text, messageObject, playerData, roleId)
    {
        let messageType = 'g';
        let isGlobalEnabled = this.config.get('server/chat/messages/global_enabled');
        let globalAllowedRoles = this.config.get('server/chat/messages/global_allowed_roles').split(',').map(Number);
        if(!isGlobalEnabled || -1 === globalAllowedRoles.indexOf(roleId)){
            let errorMessage = 'Global messages not allowed.';
            return this.sendErrorMessage(client, messageObject, errorMessage);
        }
        messageObject.m = text.substring(1);
        messageObject.t = ChatConst.CHAT_TYPE_GLOBAL;
        this.broadcast('*', messageObject);
        this.chatManager.saveMessage(
            messageObject.m,
            playerData.id,
            playerData.state.room_id,
            false,
            messageType
        ).catch((err) => {
            Logger.error('Global chat save error:', err);
        });
    }

    sendErrorMessage(client, messageObject, message)
    {
        messageObject.m = message;
        messageObject.f = 'Sys';
        messageObject.t = ChatConst.CHAT_TYPE_SYSTEM_ERROR;
        client.send('*', messageObject);
    }

    onLeave(client, consented)
    {
        if(this.config.get('server/chat/messages/broadcast_leave')){
            let activePlayer = this.activePlayers[client.sessionId];
            let sentText = `${activePlayer.playerName} has left.`;
            this.broadcast('*', {
                act: ChatConst.CHAT_ACTION,
                m: sentText,
                f: 'Sys',
                t: ChatConst.CHAT_TYPE_SYSTEM
            });
        }
        delete this.activePlayers[client.sessionId];
    }

    getActivePlayerByName(playerName)
    {
        let clientTo = false;
        for(let i of Object.keys(this.activePlayers)){
            let client = this.activePlayers[i];
            if(client.playerName === playerName){
                clientTo = client;
                break;
            }
        }
        return clientTo;
    }

}

module.exports.RoomChat = RoomChat;
