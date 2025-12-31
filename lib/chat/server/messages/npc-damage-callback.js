/**
 *
 * Reldens - NpcDamageCallback
 *
 * Sends chat messages when NPCs deal damage to players or other targets.
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class NpcDamageCallback
{

    /**
     * @param {Object} props
     * @returns {Promise<void>}
     */
    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'chatManager', 'damage', 'target'])){
            Logger.error('Invalid message on NpcDamageCallback.', props);
            return false;
        }
        let {skill, target, damage, chatManager} = props;
        let client = target?.skillsServer?.client?.client || null;
        if(!client){
            Logger.error('Client not defined on NpcDamageCallback.', target);
            return false;
        }
        let isObjectTarget = sc.hasOwn(target, 'key');
        let targetLabel = isObjectTarget ? target.title : target.playerName;
        let isObjectOwner = sc.hasOwn(skill.owner, 'key');
        let from = isObjectOwner ? skill.owner.title : skill.owner.playerName;
        let message = ChatConst.SNIPPETS.NPC_DAMAGE;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.DAMAGE]: damage,
        };
        let messageObject = MessageFactory.create(ChatConst.TYPES.DAMAGE, message, messageData, from);
        client.send(messageObject);
        let playerId = target?.player_id || null;
        let roomId = skill.owner?.room_id || null;
        let saveResult = await chatManager.saveMessage(
            MessageFactory.withDataToJson(message, messageData),
            playerId,
            roomId,
            false,
            ChatConst.TYPES.DAMAGE
        );
        if(!saveResult){
            Logger.error('Save chat message error on NPC damage callback.', messageObject, playerId, roomId);
        }
        return true;
    }

}

module.exports.NpcDamageCallback = NpcDamageCallback;
