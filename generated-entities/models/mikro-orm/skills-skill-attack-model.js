/**
 *
 * Reldens - SkillsSkillAttackModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, skill_id, affectedProperty, allowEffectBelowZero, hitDamage, applyDirectDamage, attackProperties, defenseProperties, aimProperties, dodgeProperties, dodgeFullEnabled, dodgeOverAimSuccess, damageAffected, criticalAffected} = props;
        return new this(id, skill_id, affectedProperty, allowEffectBelowZero, hitDamage, applyDirectDamage, attackProperties, defenseProperties, aimProperties, dodgeProperties, dodgeFullEnabled, dodgeOverAimSuccess, damageAffected, criticalAffected);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillAttackModel,
    tableName: 'skills_skill_attack',
    properties: {
        id: { type: 'number', primary: true },
        skill_id: { type: 'number', persist: false },
        affectedProperty: { type: 'string' },
        allowEffectBelowZero: { type: 'number', nullable: true },
        hitDamage: { type: 'number' },
        applyDirectDamage: { type: 'number', nullable: true },
        attackProperties: { type: 'string', nullable: true },
        defenseProperties: { type: 'string', nullable: true },
        aimProperties: { type: 'string', nullable: true },
        dodgeProperties: { type: 'string', nullable: true },
        dodgeFullEnabled: { type: 'number', nullable: true },
        dodgeOverAimSuccess: { type: 'number', nullable: true },
        damageAffected: { type: 'number', nullable: true },
        criticalAffected: { type: 'number', nullable: true },
        related_skills_skill: {
            kind: 'm:1',
            entity: 'SkillsSkillModel',
            joinColumn: 'skill_id'
        }
    },
});
schema._fkMappings = {
    "skill_id": {
        "relationKey": "related_skills_skill",
        "entityName": "SkillsSkillModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillAttackModel,
    entity: SkillsSkillAttackModel,
    schema: schema
};
