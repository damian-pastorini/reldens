/**
 *
 * Reldens - ChatManager
 *
 * This class will handle the chat messages in the storage.
 *
 */

const { ChatModel } = require('./model');
const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../constants');

class ChatManager
{

    async saveMessage(message, playerId, roomId, clientToPlayerSchema, messageType)
    {
        let entryData = {
            player_id: playerId,
            message: message,
            message_time: sc.getCurrentDate(),
            message_type: messageType || ChatConst.CHAT_MESSAGE
        };
        if(roomId){
            entryData.room_id = roomId;
        }
        if(clientToPlayerSchema && sc.hasOwn(clientToPlayerSchema, 'id')){
            entryData.private_player_id = clientToPlayerSchema.state.player_id;
        }
        let insertResult = await ChatModel.saveEntry(entryData);
        if(!insertResult){
            Logger.error(['Chat insert message error.', entryData]);
        }
    }

}

module.exports.ChatManager = new ChatManager();
