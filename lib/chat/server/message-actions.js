/**
 *
 * Reldens - ChatMessageActions
 *
 */

const { ChatManager } = require('./manager');
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
        this.chatManager = new ChatManager({dataServer: props.dataServer});
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        await this.chatAction(data, room, playerSchema);
        await this.clientJoinAction(data, room, playerSchema);
    }

    async clientJoinAction(data, room, playerSchema)
    {
        // @TODO - WIP.
        if(data.act !== GameConst.CLIENT_JOINED || !room.config.get('server/chat/messages/broadcast_join')){
            return false;
        }
        let sentText = `${playerSchema.playerName} has joined ${room.roomName}.`;
        room.broadcast('*', {
            act: ChatConst.CHAT_ACTION,
            m: sentText,
            f: 'Sys',
            t: ChatConst.CHAT_TYPE_SYSTEM
        });
        this.chatManager.saveMessage(
            room.roomName,
            playerSchema.player_id,
            playerSchema.state.room_id,
            false,
            ChatConst.TYPES.JOINED
        ).catch((err) => {
            Logger.error(['Joined room chat save error:', err]);
        });
    }

    async chatAction(data, room, playerSchema)
    {
        if(sc.get(data, 'act', '') !== ChatConst.CHAT_ACTION){
            return false;
        }
        let dataMessage = data[ChatConst.MESSAGE.KEY];
        if(0 === dataMessage.trim().replace('#', '').replace('@', '').length){
            return false;
        }
        let message = Cleaner.cleanMessage(dataMessage, room.config.get('client/chat/messages/characterLimit'));
        let messageData = {
            act: ChatConst.CHAT_ACTION,
            m: message,
            f: playerSchema.playerName,
            [ChatConst.TYPES.KEY]: ChatConst.CHAT_TYPE_NORMAL
        };
        room.broadcast('*', messageData);
        this.chatManager.saveMessage(
            message,
            playerSchema.player_id,
            playerSchema.state.room_id,
            false,
            ChatConst.TYPES.MESSAGE
        ).catch((err) => {
            Logger.error(['Chat save error:', err]);
        });
    }
}

module.exports.ChatMessageActions = ChatMessageActions;
