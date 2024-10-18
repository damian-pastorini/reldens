/**
 *
 * Reldens - ChatMessageActions
 *
 */

const { ChatManager } = require('./manager');
const { MessageFactory } = require('../message-factory');
const { MessagesGuard } = require('./messages-guard');
const { Cleaner } = require('../cleaner');
const { ChatConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class ChatMessageActions
{

    constructor(props)
    {
        let dataServer = sc.get(props, 'dataServer', false);
        if(!dataServer){
            Logger.error('DataServer undefined in ChatMessageActions.');
        }
        this.chatManager = new ChatManager({dataServer});
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        await this.chatAction(data, room, playerSchema);
        await this.clientJoinAction(data, room, playerSchema);
    }

    async clientJoinAction(data, room, playerSchema)
    {
        if(!data || !room || !playerSchema){
            return false;
        }
        if(data.act !== GameConst.CLIENT_JOINED || !room.config.get('server/chat/messages/broadcast_join')){
            return false;
        }
        let message = ChatConst.SNIPPETS.JOINED_ROOM;
        let messageData = {
            [ChatConst.MESSAGE.DATA.PLAYER_NAME]: playerSchema.playerName,
            [ChatConst.MESSAGE.DATA.ROOM_NAME]: room.roomName,
        };
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.SYSTEM,
            message,
            messageData
        );
        room.broadcast('*', messageObject);
        let playerId = playerSchema.player_id;
        let roomId = playerSchema.state.room_id;
        let saveResult = await this.chatManager.saveMessage(
            MessageFactory.withDataToJson(message, messageData),
            playerId,
            roomId,
            false,
            ChatConst.TYPES.JOINED
        );
        if(!saveResult){
            Logger.critical('Joined room chat save error.', messageObject, playerId, roomId);
        }
    }

    async chatAction(data, room, playerSchema)
    {
        if(!data || !room || !playerSchema){
            return false;
        }
        if(!MessagesGuard.validate(data)){
            return false;
        }
        let message = Cleaner.cleanMessage(
            data[ChatConst.MESSAGE.KEY],
            room.config.get('client/chat/messages/characterLimit')
        );
        let messageData = MessageFactory.create(ChatConst.TYPES.MESSAGE, message, {}, playerSchema.playerName);
        room.broadcast('*', messageData);
        let playerId = playerSchema.player_id;
        let roomId = playerSchema.state.room_id;
        let saveResult = await this.chatManager.saveMessage(message, playerId, roomId, false, ChatConst.TYPES.MESSAGE);
        if(!saveResult){
            Logger.critical('Chat save error.', messageData, playerId, roomId);
        }
    }
}

module.exports.ChatMessageActions = ChatMessageActions;
