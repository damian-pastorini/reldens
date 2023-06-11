/**
 *
 * Reldens - NpcModifiersCallback
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

class NpcModifiersCallback
{
    
    static async sendMessage(props)
    {
        let {skill, chatManager} = props;
        let client = skill.target?.skillsServer?.client?.client || null;
        if(!client){
            return false;
        }
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let lastAppliedModifiers = sc.get(skill, 'lastAppliedModifiers', {});
        let appliedModifiersKeys = Object.keys(lastAppliedModifiers);
        if(0 === appliedModifiersKeys.length){
            return false;
        }
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let sendMessage = '';
        for(let i of appliedModifiersKeys){
            let value = lastAppliedModifiers[i];
            let property = i.split('/').pop();
            sendMessage += value+' '+property+ChatConst.MESSAGES.ON+targetLabel+' ';
        }
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
            ChatConst.TYPES.SKILL
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.NpcModifiersCallback = NpcModifiersCallback;
