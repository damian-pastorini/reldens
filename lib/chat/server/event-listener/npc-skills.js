/**
 *
 * Reldens - NpcSkills
 *
 */

const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { sc } = require('@reldens/utils');
const { NpcDamageCallback } = require('../messages/npc-damage-callback');
const { NpcModifiersCallback } = require('../messages/npc-modifiers-callback');
const { NpcDodgeCallback } = require('../messages/npc-dodge-callback');

class NpcSkills
{

    static listenEvents(props, chatConfig, chatManager)
    {
        let skillsByType = this.fetchSkillsByType(props, chatConfig);
        let attackSkill = sc.get(skillsByType, SkillConst.SKILL_TYPE_ATTACK, null);
        let effectSkill = sc.get(skillsByType, SkillConst.SKILL_TYPE_EFFECT, null);
        this.listenDamageEvent(attackSkill, chatConfig, chatManager);
        this.listenModifiersEvent(effectSkill, chatConfig, chatManager);
        this.listenAfterRunLogicEvent((attackSkill || effectSkill), chatConfig, chatManager);

    }

    static listenDamageEvent(attackSkill, chatConfig, chatManager)
    {
        if(!chatConfig.damageMessages || null === attackSkill){
            return;
        }
        attackSkill.listenEvent(
            SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
            async (skill, target, damage) => {
                if(!damage){
                    return;
                }
                await NpcDamageCallback.sendMessage({skill, target, damage, chatManager});
            },
            'skillAttackApplyDamageChat',
            attackSkill.owner[attackSkill.ownerIdProperty]
        );
    }

    static listenModifiersEvent(effectSkill, chatConfig, chatManager)
    {
        if(!chatConfig.effectMessages || null === effectSkill){
            return;
        }
        effectSkill.listenEvent(
            SkillsEvents.SKILL_EFFECT_TARGET_MODIFIERS,
            async (skill) => {
                await NpcModifiersCallback.sendMessage({skill, chatManager});
            },
            'skillApplyModifiersChat',
            effectSkill.owner[effectSkill.ownerIdProperty]
        );
    }

    static listenAfterRunLogicEvent(skillForLogic, chatConfig, chatManager)
    {
        if(!chatConfig.dodgeMessages || null === skillForLogic){
            return;
        }
        skillForLogic.listenEvent(
            SkillsEvents.SKILL_AFTER_RUN_LOGIC,
            async (skill) => {
                if(SkillConst.SKILL_STATES.DODGED !== skill.lastState){
                    return;
                }
                await NpcDodgeCallback.sendMessage({skill, chatManager});
            },
            'skillDodgeChat',
            skillForLogic.owner[skillForLogic.ownerIdProperty]
        );
    }

    static fetchSkillsByType(props, chatConfig)
    {
        let skillInstancesList = props.enemyObject?.actions || {};
        let keys = Object.keys(skillInstancesList);
        if(0 === keys.length){
            return {};
        }
        let skillsByType = {};
        for(let i of keys){
            let skill = skillInstancesList[i];
            if(sc.hasOwn(skillsByType, skill.type)){
                continue;
            }
            if(SkillConst.SKILL_TYPE_ATTACK === skill.type || SkillConst.SKILL_TYPE_ATTACK === skill.parentType){
                skillsByType[SkillConst.SKILL_TYPE_ATTACK] = skill;
            }
            if(SkillConst.SKILL_TYPE_EFFECT === skill.type || SkillConst.SKILL_TYPE_EFFECT === skill.parentType){
                skillsByType[SkillConst.SKILL_TYPE_EFFECT] = skill;
            }
            let totalValidTypes = sc.get(chatConfig, 'totalValidTypes', 2);
            if(totalValidTypes === Object.keys(skillsByType).length){
                break;
            }
        }
        return skillsByType;
    }

}

module.exports.NpcSkills = NpcSkills;
