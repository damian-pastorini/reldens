/**
 *
 * Reldens - ChatManager
 *
 */

const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ChatManager
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
    }

    async saveMessage(message, playerId, roomId, clientToPlayerSchema, messageType)
    {
        if(!this.dataServer){
            Logger.error('Data Server undefined in ChatManager.');
        }
        let entryData = {
            player_id: playerId,
            message: message,
            message_time: sc.getCurrentDate(),
            message_type: messageType || ChatConst.TYPES.MESSAGE
        };
        if(roomId){
            entryData.room_id = roomId;
        }
        if(clientToPlayerSchema && sc.hasOwn(clientToPlayerSchema, 'id')){
            entryData.private_player_id = clientToPlayerSchema.state.player_id;
        }
        let insertResult = await this.dataServer.getEntity('chat').create(entryData);
        if(!insertResult){
            Logger.critical('Chat message save error.', entryData);
            return false;
        }
        return true;
    }

}

module.exports.ChatManager = ChatManager;
