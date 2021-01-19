/**
 *
 * Reldens - ChatManager
 *
 * This class will handle the chat messages in the storage.
 *
 */

const { ChatModel } = require('./model');
const { Logger } = require('@reldens/utils');

class ChatManager
{

    async saveMessage(message, playerId, roomId, clientToPlayerSchema, messageType)
    {
        let entryData = {
            player_id: playerId,
            message: message,
            message_time: this.getCurrentDate()
        };
        if(roomId){
            entryData.room_id = roomId;
        }
        if(clientToPlayerSchema && {}.hasOwnProperty.call(clientToPlayerSchema, 'id')){
            entryData.private_player_id = clientToPlayerSchema.state.player_id;
        }
        if(messageType){
            entryData.message_type = messageType;
        }
        let insertResult = await ChatModel.saveEntry(entryData);
        if(!insertResult){
            Logger.error(['Chat insert message error.', entryData]);
        }
    }

    /**
     * Current date is just for internal use and save the message date on the server side.
     */
    getCurrentDate()
    {
        // get date:
        let date = new Date();
        // format:
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

}

module.exports.ChatManager = new ChatManager();
