/**
 *
 * Reldens - NpcModifiersCallback
 *
 * Sends chat messages when NPC skills apply modifiers to targets.
 *
 */

const { MessageFactory } = require('../../message-factory');
const { MessageDataMapper } = require('./message-data-mapper');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class NpcModifiersCallback
{

    /**
     * @param {Object} props
     * @returns {Promise<void>}
     */
    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'chatManager'])){
            Logger.error('Invalid message on NpcModifiersCallback.', props);
            return false;
        }
        let {skill, chatManager} = props;
        let client = skill.target?.skillsServer?.client?.client || null;
        if(!client){
            Logger.info('Client not defined on NpcModifiersCallback.', skill);
            return false;
        }
        let messageWithData = MessageDataMapper.mapMessageWithData(skill);
        if(!messageWithData){
            return false;
        }
        let {message, messageData} = messageWithData;
        let isObjectOwner = sc.hasOwn(skill.owner, 'key');
        let from = isObjectOwner ? skill.owner.title : skill.owner.playerName;
        let messageObject = MessageFactory.create(ChatConst.TYPES.SKILL, message, messageData, from);
        client.send(messageObject);
        let playerId = skill.target?.player_id || null;
        let roomId = skill.owner?.room_id || null;
        let saveResult = await chatManager.saveMessage(
            MessageFactory.withDataToJson(message, messageData),
            playerId,
            roomId,
            false,
            ChatConst.TYPES.SKILL
        );
        if(!saveResult){
            Logger.error('Save chat message error on modifiers callback.', messageObject, playerId, roomId);
        }
        return true;
    }

}

module.exports.NpcModifiersCallback = NpcModifiersCallback;
