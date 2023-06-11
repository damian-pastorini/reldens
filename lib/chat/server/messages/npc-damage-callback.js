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
            [ChatConst.MESSAGE.DATA.NPC_DAMAGE]: damage,
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
        };
        let messageObject = MessageFactory.create(
            ChatConst.CHAT_TYPE_SYSTEM_BATTLE,
            message,
            messageData,
            skill.owner?.title
        );
        client.send(messageObject);
        let saveResult = await chatManager.saveMessage(
            Object.assign({[ChatConst.MESSAGE.KEY]: message}, messageData),
            (target?.player_id || null),
            (skill.owner?.room_id || null),
            false,
            ChatConst.TYPES.DAMAGE
        );
        if(!saveResult){
            Logger.error('Save chat message error on NPC damage callback.', messageObject);
        }
    }
    
}

module.exports.NpcDamageCallback = NpcDamageCallback;
