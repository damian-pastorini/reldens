/**
 *
 * Reldens - ChatManager
 *
 * This class will handle the chat features.
 *
 */

const ChatModel = require('./model');

class ChatManager
{

    /**
     * @param message
     * @param playerSchema
     * @param playerSceneId
     * @param clientTo
     * @param messageType
     */
    async saveMessage(message, playerSchema, playerSceneId, clientToPlayerSchema, messageType)
    {
        // @TODO: fix, playerSchema is actually the currentUser.
        // console.log('playerSchema:', playerSchema);
        let insertModel = {
            // @TODO: temporal getting player_id from stats.
            player_id: playerSchema.stats.player_id,
            message: message,
            message_time: this.getCurrentDate()
        };
        if(playerSchema.state.room_id){
            insertModel.room_id = playerSchema.state.room_id;
        }
        if(clientToPlayerSchema.hasOwnProperty('id')){
            insertModel.private_player_id = clientToPlayerSchema.state.player_id;
        }
        if(messageType){
            insertModel.message_type = messageType;
        }
        let insertResult = await ChatModel.query().insert(insertModel);
        if(!insertResult){
            console.log('ERROR - Chat message error.', insertModel);
        }
    }

    getCurrentDate()
    {
        // get date:
        let date = new Date();
        // format:
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

}

module.exports = new ChatManager();