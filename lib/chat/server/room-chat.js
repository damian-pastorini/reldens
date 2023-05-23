/**
 *
 * Reldens - RoomChat
 *
 */

const { RoomLogin } = require('../../rooms/server/login');
const { ChatManager } = require('./manager');
const { MessageFactory } = require('../message-factory');
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

    async handleReceivedMessage(client, data)
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
        if(0 === text.indexOf('@')){
            return await this.sendPrivateMessage(client, data[ChatConst.CHAT_TO], text, activePlayer);
        }
        if(0 === text.indexOf('#')){
            return await this.sendGlobalMessage(client, text, activePlayer);
        }
    }

    async sendPrivateMessage(client, toPlayer, text, activePlayer)
    {
        if(!toPlayer){
            return false;
        }
        let clientTo = this.getActivePlayerByName(toPlayer);
        if(!clientTo){
            return client.send('*', MessageFactory.create(
                ChatConst.TYPES.ERROR,
                'Private chat player not found '+toPlayer, // @TODO - WIP - Refactor to snippet and use messageData.
            ));
        }
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.PRIVATE,
            text.substring(text.indexOf(' ')),
            {},
            activePlayer.playerName
        );
        client.send('*', messageObject);
        messageObject[ChatConst.MESSAGE.FROM] = toPlayer.playerName;
        clientTo.client.send('*', messageObject);
        let saveResult = await this.chatManager.saveMessage(
            messageObject[ChatConst.MESSAGE.KEY],
            activePlayer.playerData.id,
            activePlayer.playerData.state.room_id,
            clientTo?.playerData,
            ChatConst.TYPES.PRIVATE
        );
        if(!saveResult){
            Logger.error('Private chat save error.', messageObject);
        }
    }

    async sendGlobalMessage(client, text, activePlayer)
    {
        if(!this.config.get('server/chat/messages/global_enabled')){
            return client.send('*', MessageFactory.create(
                ChatConst.TYPES.ERROR,
                'Global messages not allowed.' // @TODO - WIP - Refactor to snippet
            ));
        }
        let globalAllowedRoles = this.config.get('server/chat/messages/global_allowed_roles').split(',').map(Number);
        if(-1 === globalAllowedRoles.indexOf(activePlayer.role_id)){
            return client.send('*', MessageFactory.create(
                ChatConst.TYPES.ERROR,
                'Global messages permission denied.' // @TODO - WIP - Refactor to snippet
            ));
        }
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.GLOBAL,
            text.substring(1),
            {},
            activePlayer.playerName
        );
        this.broadcast('*', messageObject);
        let saveResult = await this.chatManager.saveMessage(
            messageObject[ChatConst.MESSAGE.KEY],
            activePlayer.playerData.id,
            activePlayer.playerData.state.room_id,
            false,
            ChatConst.TYPES.GLOBAL
        );
        if(!saveResult){
            Logger.error('Global chat save error.', messageObject);
        }
    }

    async onLeave(client, consented)
    {
        let activePlayer = this.activePlayers[client.sessionId];
        if(!activePlayer){
            return false;
        }
        if(this.config.get('server/chat/messages/broadcast_leave')){
            this.broadcast('*', MessageFactory.create(
                ChatConst.TYPES.SYSTEM,
                activePlayer.playerName+' has left.' // @TODO - WIP - Refactor to snippet
            ));
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
