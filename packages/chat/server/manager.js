/**
 *
 * Reldens - ChatManager
 *
 * This class will handle the chat messages in the storage.
 *
 */

const { ChatModel } = require('./model');
const { Logger } = require('../../game/logger');

class ChatManager
{

    /**
     * @param message
     * @param playerSchema
     * @param clientToPlayerSchema
     * @param messageType
     */
    async saveMessage(message, playerSchema, clientToPlayerSchema, messageType)
    {
        // @TODO: since for now we only have one player by user, playerSchema is actually the currentUser.
        let insertModel = {
            player_id: playerSchema.player_id,
            message: message,
            message_time: this.getCurrentDate()
        };
        if(playerSchema.state.room_id){
            insertModel.room_id = playerSchema.state.room_id;
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
