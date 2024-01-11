/**
 *
 * Reldens - NpcSkills
 *
 */

const { NpcDamageCallback } = require('../messages/npc-damage-callback');
const { NpcModifiersCallback } = require('../messages/npc-modifiers-callback');
const { NpcDodgeCallback } = require('../messages/npc-dodge-callback');
const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class NpcSkills
{

    static listenEvents(props, chatConfig, chatManager)
    {
        let skillsByType = this.fetchSkillsByType(props, chatConfig);
        let attackSkill = sc.get(skillsByType, SkillConst.SKILL.TYPE.ATTACK, null);
        let effectSkill = sc.get(skillsByType, SkillConst.SKILL.TYPE.EFFECT, null);
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
            attackSkill.getOwnerUniqueEventKey('skillAttackApplyDamageChat'),
            // @NOTE: objects ownerIdProperty is their uid and that's used as master key for the object event listeners.
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
            effectSkill.getOwnerUniqueEventKey('skillApplyModifiersChat'),
            // @NOTE: objects ownerIdProperty is their uid and that's used as master key for the object event listeners.
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
            skillForLogic.getOwnerUniqueEventKey('skillDodgeChat'),
            // @NOTE: objects ownerIdProperty is their uid and that's used as master key for the object event listeners.
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
            if(SkillConst.SKILL.TYPE.ATTACK === skill.type || SkillConst.SKILL.TYPE.ATTACK === skill.parentType){
                skillsByType[SkillConst.SKILL.TYPE.ATTACK] = skill;
            }
            if(SkillConst.SKILL.TYPE.EFFECT === skill.type || SkillConst.SKILL.TYPE.EFFECT === skill.parentType){
                skillsByType[SkillConst.SKILL.TYPE.EFFECT] = skill;
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
