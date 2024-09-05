/**
 *
 * Reldens - PlayerModifiersCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { MessageDataMapper } = require('./message-data-mapper');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class PlayerModifiersCallback
{

    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'client', 'chatManager'])){
            Logger.error('Invalid message on PlayerModifiersCallback.', props);
            return false;
        }
        let {skill, client, chatManager} = props;
        if(!client){
            Logger.info('Client not defined on PlayerModifiersCallback.', skill);
            return false;
        }
        let messageWithData = MessageDataMapper.mapMessageWithData(skill);
        if(!messageWithData){
            return false;
        }
        let {message, messageData} = messageWithData;
        let messageObject = MessageFactory.create(ChatConst.TYPES.SKILL, message, messageData, skill.owner.playerName);
        client.send(messageObject);
        let targetClient = skill.target?.skillsServer?.client?.client || null;
        if(!isObjectTarget && targetClient){
            targetClient.send(messageObject);
        }
        let playerId = skill.owner.player_id;
        let roomId = skill.owner.state.room_id;
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
    }
    
}

module.exports.PlayerModifiersCallback = PlayerModifiersCallback;
