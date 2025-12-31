/**
 *
 * Reldens - MessageDataMapper
 *
 * Maps skill data into a chat message format with modifiers information.
 *
 */

const { ChatConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class MessageDataMapper
{

    /**
     * @param {Object} skill
     * @returns {Object|boolean}
     */
    static mapMessageWithData(skill)
    {
        let lastAppliedModifiers = sc.get(skill, 'lastAppliedModifiers', {});
        let appliedModifiersKeys = Object.keys(lastAppliedModifiers);
        if(0 === appliedModifiersKeys.length){
            return false;
        }
        let isObjectTarget = sc.hasOwn(skill.target, 'key');
        let targetLabel = isObjectTarget ? skill.target.title : skill.target.playerName;
        let message = ChatConst.SNIPPETS.MODIFIERS_APPLY;
        let messageData = {
            [ChatConst.MESSAGE.DATA.TARGET_LABEL]: targetLabel,
            [ChatConst.MESSAGE.DATA.MODIFIERS]: {}
        };
        for(let i of appliedModifiersKeys){
            let value = lastAppliedModifiers[i];
            let property = i.split('/').pop();
            messageData[ChatConst.MESSAGE.DATA.MODIFIERS][property] = value;
        }
        return {message, messageData};
    }

}

module.exports.MessageDataMapper = MessageDataMapper;
