/**
 *
 * Reldens - PlayerDamageCallback
 *
 * Sends chat messages when players deal damage to targets.
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class PlayerDamageCallback
{

    /**
     * @param {Object} props
     * @returns {Promise<void>}
     */
    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'client', 'chatManager', 'damage', 'target'])){
            Logger.error('Invalid message on PlayerDamageCallback.', props);
            return false;
        }
        let {skill, target, damage, client, chatManager} = props;
        if(!client){
            Logger.info('Client not defined on PlayerDamageCallback.', skill);
            return false;
        }
        let isObjectTarget = sc.hasOwn(target, 'key');
        let targetLabel = isObjectTarget ? target.title : target.playerName;
        let message = ChatConst.SNIPPETS.PLAYER.DAMAGE;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.DAMAGE]: damage,
        };
        let messageObject = MessageFactory.create(ChatConst.TYPES.DAMAGE, message, messageData, skill.owner.playerName);
        client.send(messageObject);
        let targetClient = skill.target?.skillsServer?.client?.client || null;
        if(!isObjectTarget && targetClient && targetClient !== client){
            targetClient.send(messageObject);
        }
        let playerId = skill.owner?.player_id || null;
        let roomId = skill.owner?.state?.room_id || null;
        let saveResult = await chatManager.saveMessage(
            MessageFactory.withDataToJson(message, messageData),
            playerId,
            roomId,
            false,
            ChatConst.TYPES.DAMAGE
        );
        if(!saveResult){
            Logger.error('Save chat message error on player damage callback.', messageObject, playerId, roomId);
        }
        return true;
    }

}

module.exports.PlayerDamageCallback = PlayerDamageCallback;
