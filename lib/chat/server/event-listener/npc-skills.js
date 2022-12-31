/**
 *
 * Reldens - NpcSkills
 *
 */

const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { sc } = require('@reldens/utils');
const { NpcDamageCallback } = require('../messages/npc-damage-callback');

class NpcSkills
{

    static listenEvents(props, chatConfig, chatManager)
    {
        let skillsByType = this.fetchSkillsByType(props, chatConfig);
        this.listenDamageEvent(
            sc.get(skillsByType, SkillConst.SKILL_TYPE_ATTACK, null),
            chatConfig,
            chatManager
        );
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
                await NpcDamageCallback.sendMessage({
                    skill,
                    target,
                    damage,
                    chatManager: chatManager
                });
            },
            'skillAttackApplyDamageChat',
            attackSkill.owner[attackSkill.ownerIdProperty]
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
