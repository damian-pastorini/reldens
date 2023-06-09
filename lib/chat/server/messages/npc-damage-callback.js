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
        // @TODO - WIP.
        let {skill, target, damage, chatManager} = props;
        let client = target?.skillsServer?.client?.client || null;
        if(!client){
            return false;
        }
        // let player = client.room?.activePlayers[client.client?.id] || false;
        let isObjectTarget = sc.hasOwn(target, 'key');
        let targetLabel = isObjectTarget ? target.title : target.playerName;
        let sendMessage = ChatConst.SNIPPETS.NPC_DAMAGE;
        let mD = ChatConst.MESSAGE.DATA;
        let messageData = {
            [mD.NPC_DAMAGE]: damage,
            [mD.TARGET_LABEL]: targetLabel,
        };
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            [ChatConst.CHAT_FROM]: skill.owner.title,
            [ChatConst.CHAT_MESSAGE]: sendMessage,
            [mD.KEY]: messageData,
            [ChatConst.CHAT_TYPES.KEY]: ChatConst.CHAT_TYPE_SYSTEM_BATTLE
        };
        client.send(messageObject);
        await chatManager.saveMessage(
            Object.assign({[ChatConst.CHAT_MESSAGE]: sendMessage}, messageData),
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
