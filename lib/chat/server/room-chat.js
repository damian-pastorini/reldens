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
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class RoomChat extends RoomLogin
{

    onCreate(props)
    {
        super.onCreate(props);
        Logger.info('Created RoomChat: '+this.roomName+' ('+this.roomId+').');
        this.roomType = ChatConst.ROOM_TYPE_CHAT;
        let dataServer = sc.get(this, 'dataServer', false);
        if(!dataServer){
            Logger.error('DataServer undefined in RoomChat.');
        }
        this.chatManager = new ChatManager({dataServer: this.dataServer});
        delete props.roomsManager.creatingInstances[this.roomName];
    }

    onJoin(client, props, userModel)
    {
        this.loginManager.activePlayers.add(userModel, client, this);
    }

    async handleReceivedMessage(client, data)
    {
        if(data[GameConst.ACTION_KEY] !== ChatConst.CHAT_ACTION){
            return;
        }
        let text = Cleaner.cleanMessage(
            data[ChatConst.MESSAGE.KEY],
            this.config.get('client/chat/messages/characterLimit')
        );
        if(
            0 === text.replace('#', '').trim().length
            // do not count the player name on private messages:
            || (-1 !== text.indexOf('@') && 0 === text.substring(text.indexOf(' ')).trim().length)
        ){
            // do nothing if text is shorter than 3 characters (including @ and #):
            return;
        }
        let activePlayer = this.activePlayerBySessionId(client.sessionId, this.roomId);
        if(!activePlayer){
            Logger.warning('Current Active Player not found: '+client.sessionId);
            return;
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
            Logger.info('Missing player recipient.');
            return false;
        }
        let activePlayerTo = this.activePlayerByPlayerName(toPlayer, this.roomId);
        if(!activePlayerTo){
            let message = ChatConst.SNIPPETS.PRIVATE_MESSAGE_PLAYER_NOT_FOUND;
            let messageData = {
                [ChatConst.MESSAGE.DATA.PLAYER_NAME]: toPlayer
            };
            let messageObject = MessageFactory.create(
                ChatConst.TYPES.ERROR,
                message,
                messageData
            );
            client.send('*', messageObject);
            let saveResult = await this.chatManager.saveMessage(
                MessageFactory.withDataToJson(message, messageData),
                activePlayer.playerId,
                activePlayer?.playerData?.state?.room_id,
                activePlayerTo?.playerData,
                ChatConst.TYPES.ERROR
            );
            if(!saveResult){
                Logger.critical('Private failed chat save error.', messageObject);
            }
            return;
        }
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.PRIVATE,
            text.substring(text.indexOf(' ')),
            {},
            activePlayer.playerName
        );
        client.send('*', messageObject);
        activePlayerTo?.client.send('*', messageObject);
        let saveResult = await this.chatManager.saveMessage(
            messageObject[ChatConst.MESSAGE.KEY],
            activePlayer.playerId,
            activePlayer?.playerData?.state?.room_id,
            activePlayerTo?.playerData,
            ChatConst.TYPES.PRIVATE
        );
        if(!saveResult){
            Logger.critical('Private chat save error.', messageObject);
        }
    }

    async sendGlobalMessage(client, text, activePlayer)
    {
        if(!this.config.get('server/chat/messages/global_enabled')){
            return client.send('*', MessageFactory.create(
                ChatConst.TYPES.ERROR,
                ChatConst.SNIPPETS.GLOBAL_MESSAGE_NOT_ALLOWED
            ));
        }
        let globalAllowedRoles = this.config.get('server/chat/messages/global_allowed_roles').split(',').map(Number);
        if(-1 === globalAllowedRoles.indexOf(activePlayer.roleId)){
            return client.send('*', MessageFactory.create(
                ChatConst.TYPES.ERROR,
                ChatConst.SNIPPETS.GLOBAL_MESSAGE_PERMISSION_DENIED,
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
            activePlayer.playerId,
            activePlayer?.playerData?.state?.room_id,
            false,
            ChatConst.TYPES.GLOBAL
        );
        if(!saveResult){
            Logger.critical('Global chat save error.', messageObject);
        }
    }

    async onLeave(client, consented)
    {
        this.broadcastLeaveMessage(client.sessionId);
        this.loginManager.activePlayers.removeByRoomAndSessionId(client.sessionId, this.roomId);
    }

    broadcastLeaveMessage(sessionId)
    {
        let activePlayer = this.activePlayerBySessionId(sessionId, this.roomId);
        if(!activePlayer){
            return false;
        }
        if(!this.config.getWithoutLogs('server/chat/messages/broadcast_leave', false)){
            return false;
        }
        let message = ChatConst.SNIPPETS.LEFT_ROOM;
        let messageData = {
            [ChatConst.MESSAGE.DATA.PLAYER_NAME]: activePlayer.playerName
        };
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.SYSTEM,
            message,
            messageData
        );
        this.broadcast('*', messageObject);
    }
}

module.exports.RoomChat = RoomChat;
