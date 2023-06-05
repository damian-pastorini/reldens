/**
 *
 * Reldens - NpcDamageCallback
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

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
        let sendMessage = damage+ChatConst.MESSAGES.ON+(isObjectTarget ? target.title : target.playerName);
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            f: skill.owner.title,
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_SYSTEM_BATTLE
        };
        client.send(messageObject);
        await chatManager.saveMessage(
            sendMessage,
            (target?.player_id || null),
            (skill.owner?.room_id || null),
            false,
            ChatConst.CHAT_DAMAGE
        ).catch((err) => {
            Logger.error('Save chat message error on NPC damage callback.', err);
        });
    }
    
}

module.exports.NpcDamageCallback = NpcDamageCallback;
