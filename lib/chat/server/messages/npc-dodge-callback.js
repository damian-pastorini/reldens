/**
 *
 * Reldens - NpcDodgeCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

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
        let sendMessage = targetLabel+ChatConst.MESSAGES.DODGED+skill.key; // @TODO - WIP - Refactor to snippet
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.SKILL,
            sendMessage,
            {},
            skill.owner.title
        );
        client.send(messageObject);
        let playerId = skill.target?.player_id || null;
        let roomId = skill.owner?.room_id || null;
        let saveResult = await chatManager.saveMessage(sendMessage, playerId, roomId, false, ChatConst.TYPES.SKILL);
        if(!saveResult){
            Logger.error('Save chat message error on player damage callback.', messageObject, playerId, roomId);
        }
    }
    
}

module.exports.NpcDodgeCallback = NpcDodgeCallback;
