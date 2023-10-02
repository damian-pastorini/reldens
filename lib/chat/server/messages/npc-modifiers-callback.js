/**
 *
 * Reldens - NpcModifiersCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class NpcModifiersCallback
{
    
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
        let lastAppliedModifiers = sc.get(skill, 'lastAppliedModifiers', {});
        let appliedModifiersKeys = Object.keys(lastAppliedModifiers);
        if(0 === appliedModifiersKeys.length){
            return false;
        }
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
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
            Logger.error('Save chat message error on npc modifiers callback.', messageObject, playerId, roomId);
        }
    }
    
}

module.exports.NpcModifiersCallback = NpcModifiersCallback;
