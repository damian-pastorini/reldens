/**
 *
 * Reldens - PlayerModifiersCallback
 *
 */

const { MessageFactory } = require('../../message-factory');
const { ChatConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

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
            // @TODO - WIP - Refactor to snippet
            sendMessage += value+' '+property+ChatConst.MESSAGES.ON+targetLabel+' ';
        }
        let messageObject = MessageFactory.create(
            ChatConst.TYPES.SKILL,
            sendMessage,
            {},
            skill.owner.playerName
        )
        client.send(messageObject);
        let targetClient = skill.target?.skillsServer?.client?.client || null;
        if(!isObjectTarget && targetClient){
            targetClient.send(messageObject);
        }
        let playerId = skill.owner.player_id;
        let roomId = skill.owner.state.room_id;
        let saveResult = await chatManager.saveMessage(sendMessage, playerId, roomId, false, ChatConst.TYPES.SKILL)
        if(!saveResult){
            Logger.error('Save chat message error on player damage callback.', messageObject, playerId, roomId);
        }
    }
    
}

module.exports.PlayerModifiersCallback = PlayerModifiersCallback;
