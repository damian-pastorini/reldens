/**
 *
 * Reldens - NpcDodgeCallback
 *
 * Sends chat messages when NPC skills are dodged by targets.
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class NpcDodgeCallback
{

    /**
     * @param {Object} props
     * @returns {Promise<void>}
     */
    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'chatManager'])){
            Logger.error('Invalid message on NpcDodgeCallback.', props);
            return false;
        }
        let {skill, chatManager} = props;
        let client = skill.target?.skillsServer?.client?.client || null;
        if(!client){
            Logger.error('Client not defined on NpcDodgeCallback.', skill);
            return false;
        }
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let isObjectOwner = sc.hasOwn(skill.owner, 'key');
        let from = isObjectOwner ? skill.owner.title : skill.owner.playerName;
        let message = ChatConst.SNIPPETS.NPC_DODGED_SKILL;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.SKILL_LABEL]: skill.label,
        };
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
            Logger.error('Save chat message error on npc dodge callback.', messageObject, playerId, roomId);
        }
        return true;
    }

}

module.exports.NpcDodgeCallback = NpcDodgeCallback;
