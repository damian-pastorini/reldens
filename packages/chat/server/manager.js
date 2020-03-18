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

    /**
     * @param message
     * @param playerId
     * @param roomId
     * @param clientToPlayerSchema
     * @param messageType
     * @returns {Promise<void>}
     */
    async saveMessage(message, playerId, roomId, clientToPlayerSchema, messageType)
    {
        // @TODO: since for now we only have one player by user, playerSchema is actually the currentUser.
        let insertModel = {
            player_id: playerId,
            message: message,
            message_time: this.getCurrentDate()
        };
        if(roomId){
            insertModel.room_id = roomId;
        }
        if(clientToPlayerSchema && {}.hasOwnProperty.call(clientToPlayerSchema, 'id')){
            insertModel.private_player_id = clientToPlayerSchema.state.player_id;
        }
        if(messageType){
            insertModel.message_type = messageType;
        }
        let insertResult = await ChatModel.query().insert(insertModel);
        if(!insertResult){
            Logger.error(['Chat insert message error.', insertModel]);
        }
    }

    /**
     * Current date is just for internal use and save the message date on the server side.
     *
     * @returns {string}
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
