/**
 *
 * Reldens - SkillsExtraData
 *
 */

const { ActionsConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class SkillsExtraData
{

    static extractSkillExtraData(params)
    {
        let extraData = {};
        if(sc.hasOwn(params, 'target')){
            if(sc.hasOwn(params.target, 'key')){
                extraData[ActionsConst.DATA_TARGET_TYPE] = ActionsConst.DATA_TYPE_VALUE_ENEMY;
                extraData[ActionsConst.DATA_TARGET_KEY] = params.target.key;
            }
            if(sc.hasOwn(params.target, 'sessionId')){
                extraData[ActionsConst.DATA_TARGET_TYPE] = ActionsConst.DATA_TYPE_VALUE_PLAYER;
                extraData[ActionsConst.DATA_TARGET_KEY] = params.target.sessionId;
            }
        }
        if(sc.hasOwn(params, 'skill')){
            if(sc.hasOwn(params.skill.owner, 'key')){
                extraData[ActionsConst.DATA_OWNER_TYPE] = ActionsConst.DATA_TYPE_VALUE_ENEMY;
                extraData[ActionsConst.DATA_OWNER_KEY] = params.skill.owner.key;
            }
            if(sc.hasOwn(params.skill.owner, 'sessionId')){
                extraData[ActionsConst.DATA_OWNER_TYPE] = ActionsConst.DATA_TYPE_VALUE_PLAYER;
                extraData[ActionsConst.DATA_OWNER_KEY] = params.skill.owner.sessionId;
            }
        }
        return extraData;
    }
}

module.exports.SkillsExtraData = SkillsExtraData;
