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
        let sendMessage = damage + ' hit on ' + (isObjectTarget ? target.title : target.playerName);
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            f: skill.owner.playerName,
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_SYSTEM_BATTLE
        };
        client.send(messageObject);
        await chatManager.saveMessage(
            sendMessage,
            skill.owner.player_id,
            skill.owner.state.room_id,
            false,
            ChatConst.CHAT_DAMAGE
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.PlayerDamageCallback = PlayerDamageCallback;
