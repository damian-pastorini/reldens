/**
 *
 * Reldens - MessagesGuard
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
        return !(0 !== message.act.indexOf(SkillConst.ACTIONS_PREF)
            && -1 === message.act.indexOf(ActionsConst.ACTIONS.SUFFIX.ATTACK)
            && -1 === message.act.indexOf(ActionsConst.ACTIONS.SUFFIX.EFFECT)
            && -1 === message.act.indexOf(ActionsConst.ACTIONS.SUFFIX.HIT));
    }

}

module.exports.MessagesGuard = MessagesGuard;
