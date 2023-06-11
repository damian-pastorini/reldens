/**
 *
 * Reldens - PlayerModifiersCallback
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

class PlayerModifiersCallback
{
    
    static async sendMessage(props)
    {
        let {skill, client, chatManager} = props;
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
            f: skill.owner.playerName,
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_SYSTEM
        };
        client.send(messageObject);
        let targetClient = skill.target?.skillsServer?.client?.client || null;
        if(!isObjectTarget && targetClient){
            targetClient.send(messageObject);
        }
        await chatManager.saveMessage(
            sendMessage,
            skill.owner.player_id,
            skill.owner.state.room_id,
            false,
            ChatConst.TYPES.SKILL
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.PlayerModifiersCallback = PlayerModifiersCallback;
