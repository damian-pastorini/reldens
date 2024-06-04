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
        let target = sc.get(params, 'target');
        if(target){
            if(sc.hasOwn(target, 'key')){
                extraData[ActionsConst.DATA_TARGET_TYPE] = ActionsConst.DATA_TYPE_VALUE_ENEMY;
                extraData[ActionsConst.DATA_TARGET_KEY] = target.key;
            }
            if(sc.hasOwn(target, 'sessionId')){
                extraData[ActionsConst.DATA_TARGET_TYPE] = ActionsConst.DATA_TYPE_VALUE_PLAYER;
                extraData[ActionsConst.DATA_TARGET_KEY] = target.sessionId;
            }
        }
        let skill = sc.get(params, 'skill');
        if(skill){
            if(sc.hasOwn(skill.owner, 'key')){
                extraData[ActionsConst.DATA_OWNER_TYPE] = ActionsConst.DATA_TYPE_VALUE_ENEMY;
                extraData[ActionsConst.DATA_OWNER_KEY] = skill.owner.key;
            }
            if(sc.hasOwn(skill.owner, 'sessionId')){
                extraData[ActionsConst.DATA_OWNER_TYPE] = ActionsConst.DATA_TYPE_VALUE_PLAYER;
                extraData[ActionsConst.DATA_OWNER_KEY] = skill.owner.sessionId;
            }
            // @TODO - BETA - Check if we need to include any other skill data to be sent to the client.
            if(0 < skill.skillDelay){
                extraData[ActionsConst.EXTRA_DATA.SKILL_DELAY] = skill.skillDelay;
            }
        }
        return extraData;
    }
}

module.exports.SkillsExtraData = SkillsExtraData;
