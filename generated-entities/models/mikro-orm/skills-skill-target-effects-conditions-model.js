/**
 *
 * Reldens - SkillsSkillTargetEffectsConditionsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillTargetEffectsConditionsModel
{

    constructor(id, skill_target_effect_id, key, property_key, conditional, value)
    {
        this.id = id;
        this.skill_target_effect_id = skill_target_effect_id;
        this.key = key;
        this.property_key = property_key;
        this.conditional = conditional;
        this.value = value;
    }

    static createByProps(props)
    {
        const {id, skill_target_effect_id, key, property_key, conditional, value} = props;
        return new this(id, skill_target_effect_id, key, property_key, conditional, value);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillTargetEffectsConditionsModel,
    tableName: 'skills_skill_target_effects_conditions',
    properties: {
        id: { type: 'number', primary: true },
        skill_target_effect_id: { type: 'number', persist: false },
        key: { type: 'string' },
        property_key: { type: 'string' },
        conditional: { type: 'undefined' },
        value: { type: 'string' },
        related_skills_skill_target_effects: {
            kind: 'm:1',
            entity: 'SkillsSkillTargetEffectsModel',
            joinColumn: 'skill_target_effect_id'
        }
    },
});
schema._fkMappings = {
    "skill_target_effect_id": {
        "relationKey": "related_skills_skill_target_effects",
        "entityName": "SkillsSkillTargetEffectsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillTargetEffectsConditionsModel,
    entity: SkillsSkillTargetEffectsConditionsModel,
    schema: schema
};
