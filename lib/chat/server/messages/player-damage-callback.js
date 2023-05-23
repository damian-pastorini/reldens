/**
 *
 * Reldens - PlayerDamageCallback
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

class PlayerDamageCallback
{
    
    static async sendMessage(props)
    {
        let {skill, target, damage, client, chatManager} = props;
        if(!client){
            return false;
        }
        let isObjectTarget = sc.hasOwn(target, 'key');
        let sendMessage = damage +ChatConst.MESSAGES.HIT_ON+(isObjectTarget ? target.title : target.playerName);
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            f: skill.owner.playerName,
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_SYSTEM_BATTLE
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
            ChatConst.MESSAGE_TYPE.DAMAGE
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.PlayerDamageCallback = PlayerDamageCallback;
