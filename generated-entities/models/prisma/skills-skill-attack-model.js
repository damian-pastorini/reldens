/**
 *
 * Reldens - SkillsSkillAttackModel
 *
 */

class SkillsSkillAttackModel
{

    constructor(id, skill_id, affectedProperty, allowEffectBelowZero, hitDamage, applyDirectDamage, attackProperties, defenseProperties, aimProperties, dodgeProperties, dodgeFullEnabled, dodgeOverAimSuccess, damageAffected, criticalAffected)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.affectedProperty = affectedProperty;
        this.allowEffectBelowZero = allowEffectBelowZero;
        this.hitDamage = hitDamage;
        this.applyDirectDamage = applyDirectDamage;
        this.attackProperties = attackProperties;
        this.defenseProperties = defenseProperties;
        this.aimProperties = aimProperties;
        this.dodgeProperties = dodgeProperties;
        this.dodgeFullEnabled = dodgeFullEnabled;
        this.dodgeOverAimSuccess = dodgeOverAimSuccess;
        this.damageAffected = damageAffected;
        this.criticalAffected = criticalAffected;
    }

    static get tableName()
    {
        return 'skills_skill_attack';
    }
    

    static get relationTypes()
    {
        return {
            skills_skill: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill': 'skills_skill'
        };
    }
}

module.exports.SkillsSkillAttackModel = SkillsSkillAttackModel;
