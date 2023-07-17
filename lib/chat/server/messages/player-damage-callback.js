/**
 *
 * Reldens - PlayerDamageCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { Validator } = require('./validator');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class PlayerDamageCallback
{
    
    static async sendMessage(props)
    {
        if(!Validator.validateMessage(props, ['skill', 'client', 'chatManager', 'damage', 'target'])){
            Logger.error('Invalid message on PlayerDamageCallback.', props);
            return false;
        }
        let {skill, target, damage, client, chatManager} = props;
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
        if(!isObjectTarget && targetClient){
            targetClient.send(messageObject);
        }
        await chatManager.saveMessage(
            MessageFactory.withDataToJson(message, messageData),
            skill.owner.player_id,
            skill.owner.state.room_id,
            false,
            ChatConst.TYPES.DAMAGE
        ).catch((err) => {
            Logger.error('Save chat message error on player damage callback.', err);
        });
    }
    
}

module.exports.PlayerDamageCallback = PlayerDamageCallback;
