/**
 *
 * Reldens - PlayerDodgeCallback
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

class PlayerDodgeCallback
{

    static async sendMessage(props)
    {
        let {skill, client, chatManager} = props;
        if(!client){
            return false;
        }
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let sendMessage = targetLabel+ChatConst.MESSAGES.DODGED+skill.label;
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
            ChatConst.MESSAGE_TYPE.SKILL
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.PlayerDodgeCallback = PlayerDodgeCallback;
