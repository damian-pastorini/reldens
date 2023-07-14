/**
 *
 * Reldens - PlayerDodgeCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

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
        // @TODO - WIP - TRANSLATIONS.
        let sendMessage = targetLabel+ChatConst.MESSAGES.DODGED+skill.label;
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.SYSTEM,
            sendMessage,
            {},
            skill.owner.playerName
        );
        client.send(messageObject);
        let targetClient = skill.target?.skillsServer?.client?.client || null;
        if(!isObjectTarget && targetClient){
            targetClient.send(messageObject);
        }
        let playerId = skill.owner.player_id;
        let roomId = skill.owner.state.room_id;
        let saveResult = await chatManager.saveMessage(
            sendMessage,
            playerId,
            roomId,
            false,
            ChatConst.TYPES.SKILL
        );
        if(!saveResult){
            Logger.error('Save chat message error on player damage callback.', messageObject, playerId, roomId);
        }
    }
    
}

module.exports.PlayerDodgeCallback = PlayerDodgeCallback;
