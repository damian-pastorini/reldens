/**
 *
 * Reldens - SkillsSkillOwnerEffectsConditionsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsSkillOwnerEffectsConditionsModel
{

    constructor(id, skill_owner_effect_id, key, property_key, conditional, value)
    {
        this.id = id;
        this.skill_owner_effect_id = skill_owner_effect_id;
        this.key = key;
        this.property_key = property_key;
        this.conditional = conditional;
        this.value = value;
    }

    static createByProps(props)
    {
        const {id, skill_owner_effect_id, key, property_key, conditional, value} = props;
        return new this(id, skill_owner_effect_id, key, property_key, conditional, value);
    }
    
}

const schema = new EntitySchema({
    class: SkillsSkillOwnerEffectsConditionsModel,
    tableName: 'skills_skill_owner_effects_conditions',
    properties: {
        id: { type: 'number', primary: true },
        skill_owner_effect_id: { type: 'number', persist: false },
        key: { type: 'string' },
        property_key: { type: 'string' },
        conditional: { type: 'undefined' },
        value: { type: 'string' },
        related_skills_skill_owner_effects: {
            kind: 'm:1',
            entity: 'SkillsSkillOwnerEffectsModel',
            joinColumn: 'skill_owner_effect_id'
        }
    },
});
schema._fkMappings = {
    "skill_owner_effect_id": {
        "relationKey": "related_skills_skill_owner_effects",
        "entityName": "SkillsSkillOwnerEffectsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsSkillOwnerEffectsConditionsModel,
    entity: SkillsSkillOwnerEffectsConditionsModel,
    schema: schema
};
