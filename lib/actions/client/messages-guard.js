/**
 *
 * Reldens - MessagesGuard
 *
 * Validates messages to ensure they contain valid action identifiers.
 *
 */

const { SkillConst } = require('@reldens/skills');
const { ActionsConst } = require('../constants');

/**
 * @typedef {Object} ActionMessage
 * @property {string} [act]
 */
class MessagesGuard
{

    /**
     * @param {ActionMessage} message
     * @returns {boolean}
     */
    static validate(message)
    {
        if(!message.act){
            return false;
        }
        return (
            0 === message.act.indexOf(SkillConst.ACTIONS_PREF)
            || -1 !== message.act.indexOf(ActionsConst.ACTIONS.SUFFIX.ATTACK)
            || -1 !== message.act.indexOf(ActionsConst.ACTIONS.SUFFIX.EFFECT)
            || -1 !== message.act.indexOf(ActionsConst.ACTIONS.SUFFIX.HIT)
        );
    }

}

module.exports.MessagesGuard = MessagesGuard;
