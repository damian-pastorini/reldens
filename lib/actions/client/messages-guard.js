/**
 *
 * Reldens - MessagesGuard
 *
 * Main functionalities:
 * The MessagesGuard class is responsible for validating messages received by the server. It checks if the message
 * contains a valid action and if it belongs to certain categories of actions defined in the ActionsConst object.
 *
 * Methods:
 * - validate(message): a static method that receives a message object and returns a boolean indicating if the message
 * is valid or not. It checks if the message contains a valid action and if it belongs to certain categories of actions
 * defined in the ActionsConst object.
 *
 * Fields:
 * - None. However, the class uses the ActionsConst object to validate messages. This object contains constants related
 * to actions, messages, selectors, and snippets.
 *
 */

const { SkillConst } = require('@reldens/skills');
const { ActionsConst } = require('../constants');

class MessagesGuard
{

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
