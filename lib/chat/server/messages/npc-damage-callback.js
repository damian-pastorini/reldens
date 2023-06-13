/**
 *
 * Reldens - NpcDamageCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class NpcDamageCallback
{
    
    static async sendMessage(props)
    {
        let {skill, target, damage, chatManager} = props;
        let client = target?.skillsServer?.client?.client || null;
        if(!client){
            return false;
        }
        let isObjectTarget = sc.hasOwn(target, 'key');
        let targetLabel = isObjectTarget ? target.title : target.playerName;
        let message = ChatConst.SNIPPETS.NPC_DAMAGE;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.NPC_DAMAGE]: damage,
        };
        let messageObject = MessageFactory.create(ChatConst.TYPES.DAMAGE, message, messageData, targetLabel);
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
    }
    
}

module.exports.NpcDamageCallback = NpcDamageCallback;
