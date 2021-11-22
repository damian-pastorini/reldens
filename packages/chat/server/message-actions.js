/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const { ChatManager } = require('./manager');
const { Cleaner } = require('../cleaner');
const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../constants');
const { GameConst } = require('../../game/constants');

class ChatMessageActions
{

    constructor(props)
    {
        this.chatManager = new ChatManager({dataServer: props.dataServer});
    }

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        if(sc.hasOwn(data, 'act') && data.act === ChatConst.CHAT_ACTION){
            let dataMessage = data[ChatConst.CHAT_MESSAGE];
            if(dataMessage.trim().replace('#', '').replace('@', '').length > 0){
                let message = Cleaner.cleanMessage(dataMessage);
                let messageData = {
                    act: ChatConst.CHAT_ACTION,
                    m: message,
                    f: playerSchema.playerName,
                    t: ChatConst.CHAT_TYPE_NORMAL
                };
                room.broadcast(messageData);
                this.chatManager.saveMessage(
                    message,
                    playerSchema.player_id,
                    playerSchema.state.room_id,
                    false,
                    ChatConst.CHAT_MESSAGE
                ).catch((err) => {
                    Logger.error(['Chat save error:', err]);
                });
            }
        }
        if(data.act === GameConst.CLIENT_JOINED && room.config.get('server/chat/messages/broadcast_join')){
            let sentText = `${playerSchema.playerName} has joined ${room.roomName}.`;
            room.broadcast({act: ChatConst.CHAT_ACTION, m: sentText, f: 'Sys', t: ChatConst.CHAT_TYPE_SYSTEM});
            this.chatManager.saveMessage(
                room.roomName,
                playerSchema.player_id,
                playerSchema.state.room_id,
                false,
                ChatConst.CHAT_JOINED
            ).catch((err) => {
                Logger.error(['Joined room chat save error:', err]);
            });
        }
    }

}

module.exports.ChatMessageActions = ChatMessageActions;
