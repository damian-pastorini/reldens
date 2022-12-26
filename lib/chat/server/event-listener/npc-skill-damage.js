/**
 *
 * Reldens - NpcSkillDamage
 *
 */
const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { NpcDamageCallback } = require('../messages/npc-damage-callback');

class NpcSkillDamage
{

    static listenEvent(props, chatConfig, chatManager)
    {
        if(!chatConfig.damageMessages){
            return;
        }
        let attackSkills = this.fetchAttackSkill(props);
        if(0 < attackSkills.length){
            let skill = attackSkills.shift();
            skill.listenEvent(
                SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
                async (skill, target, damage) => {
                    await NpcDamageCallback.sendMessage({
                        skill,
                        target,
                        damage,
                        chatManager: chatManager
                    });
                },
                'skillAttackApplyDamageChat',
                skill.owner[skill.ownerIdProperty]
            );
        }
    }

    static fetchAttackSkill(props)
    {
        let skillInstancesList = props.enemyObject?.actions || {};
        let keys = Object.keys(skillInstancesList);
        if(0 === keys.length){
            return [];
        }
        for(let i of keys){
            let skill = skillInstancesList[i];
            if(SkillConst.SKILL_TYPE_ATTACK !== skill.type && SkillConst.SKILL_TYPE_PHYSICAL_ATTACK !== skill.type){
                continue;
            }
            return skill;
        }
        return false;
    }

}

module.exports.NpcSkillDamage = NpcSkillDamage;
