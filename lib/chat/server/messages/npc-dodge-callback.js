/**
 *
 * Reldens - NpcDodgeCallback
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

class NpcDodgeCallback
{

    static async sendMessage(props)
    {
        let {skill, chatManager} = props;
        let client = skill.target?.skillsServer?.client?.client || null;
        if(!client){
            return false;
        }
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let sendMessage = targetLabel+ChatConst.MESSAGES.DODGED+skill.key;
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            f: skill.owner.title,
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_SYSTEM
        };
        client.send(messageObject);
        await chatManager.saveMessage(
            sendMessage,
            (skill.target?.player_id || null),
            (skill.owner?.room_id || null),
            false,
            ChatConst.MESSAGE_TYPE.SKILL
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.NpcDodgeCallback = NpcDodgeCallback;
