/**
 *
 * Reldens - PlayerModifiersCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class PlayerModifiersCallback
{
    
    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'client', 'chatManager'])){
            Logger.error('Invalid message on PlayerModifiersCallback.', props);
            return false;
        }
        let {skill, client, chatManager} = props;
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let lastAppliedModifiers = sc.get(skill, 'lastAppliedModifiers', {});
        let appliedModifiersKeys = Object.keys(lastAppliedModifiers);
        if(0 === appliedModifiersKeys.length){
            return false;
        }
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let message = ChatConst.SNIPPETS.MODIFIERS_APPLY;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.MODIFIERS]: []
        };
        for(let i of appliedModifiersKeys){
            let value = lastAppliedModifiers[i];
            let property = i.split('/').pop();
            messageData.push({[property]: value});
        }
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
            Logger.error('Save chat message error on player modifiers callback.', messageObject, playerId, roomId);
        }
    }
    
}

module.exports.PlayerModifiersCallback = PlayerModifiersCallback;
