/**
 *
 * Reldens - ChatManager
 *
 * Manages chat message persistence and database operations.
 *
 */

const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ChatManager
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {Object|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {Object} */
        this.chatRepository = this.dataServer?.getEntity('chat');
    }

    /**
     * @param {string} message
     * @param {number} playerId
     * @param {number} roomId
     * @param {Object} clientToPlayerSchema
     * @param {number} messageType
     * @returns {Promise<boolean>}
     */
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
        try {
            let insertResult = await this.chatRepository.create(entryData);
            if(!insertResult){
                Logger.critical('Chat message insert error.', entryData);
                return false;
            }
        } catch (error) {
            Logger.critical('Chat message save error.', entryData, error.message);
            return false;
        }
        return true;
    }

}

module.exports.ChatManager = ChatManager;
