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
        if(null === client){
            return false;
        }
        let isObjectTarget = sc.hasOwn(target, 'key');
        let sendMessage = damage + ' hit on ' + (isObjectTarget ? target.title : target.playerName);
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            f: skill.owner.title,
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_SYSTEM_BATTLE
        };
        client.send(messageObject);
        let roomId = skill?.owner?.room_id || null;
        // if target is not a player we can't save the message
        if(null === roomId){
            return false;
        }
        let playerId = target?.player_id || null;
        await chatManager.saveMessage(
            sendMessage,
            playerId,
            roomId,
            false,
            ChatConst.CHAT_DAMAGE
        ).catch((err) => {
            Logger.error('Save chat message error on NPC damage callback.', err);
        });
    }
    
}

module.exports.NpcDamageCallback = NpcDamageCallback;
