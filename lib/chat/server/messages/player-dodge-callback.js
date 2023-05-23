/**
 *
 * Reldens - PlayerDodgeCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class PlayerDodgeCallback
{

    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'client', 'chatManager'])){
            Logger.error('Invalid message on PlayerDodgeCallback.', props);
            return false;
        }
        let {skill, client, chatManager} = props;
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let message = ChatConst.SNIPPETS.PLAYER.DODGED_SKILL;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.SKILL_LABEL]: skill.label,
        };
        let messageObject = MessageFactory.create(ChatConst.TYPES.SKILL, message, messageData, skill.owner.playerName);
        client.send(messageObject);
        let targetClient = skill.target?.skillsServer?.client?.client || null;
        if(!isObjectTarget && targetClient){
            targetClient.send(messageObject);
        }
        let playerId = skill.owner?.player_id || null;
        let roomId = skill.owner?.state?.room_id || null;
        let saveResult = await chatManager.saveMessage(
            MessageFactory.withDataToJson(message, messageData),
            playerId,
            roomId,
            false,
            ChatConst.TYPES.SKILL
        );
        if(!saveResult){
            Logger.error('Save chat message error on player dodge callback.', messageObject, playerId, roomId);
        }
    }
    
}

module.exports.PlayerDodgeCallback = PlayerDodgeCallback;
