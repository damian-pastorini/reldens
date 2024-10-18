/**
 *
 * Reldens - SkillsExtraDataMapper
 *
 */

const { ActionsConst } = require('../constants');
const { TypeDeterminer } = require('../../game/type-determiner');
const { sc } = require('@reldens/utils');

class SkillsExtraDataMapper
{

    constructor()
    {
        this.typeDeterminer = new TypeDeterminer();
    }

    extractSkillExtraData(params)
    {
        // @TODO - BETA - Refactor conditions.
        let extraData = {};
        let target = sc.get(params, 'target');
        if(target){
            if(this.typeDeterminer.isObject(target)){
                extraData[ActionsConst.DATA_TARGET_TYPE] = ActionsConst.DATA_TYPE_VALUE_ENEMY;
                extraData[ActionsConst.DATA_TARGET_KEY] = target.key;
            }
            if(this.typeDeterminer.isPlayer(target)){
                extraData[ActionsConst.DATA_TARGET_TYPE] = ActionsConst.DATA_TYPE_VALUE_PLAYER;
                extraData[ActionsConst.DATA_TARGET_KEY] = target.sessionId;
            }
        }
        let skill = sc.get(params, 'skill');
        if(skill){
            if(this.typeDeterminer.isObject(skill.owner)){
                extraData[ActionsConst.DATA_OWNER_TYPE] = ActionsConst.DATA_TYPE_VALUE_ENEMY;
                extraData[ActionsConst.DATA_OWNER_KEY] = skill.owner.key;
            }
            if(this.typeDeterminer.isPlayer(skill.owner)){
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

module.exports.SkillsExtraDataMapper = SkillsExtraDataMapper;
