/**
 *
 * Reldens - SkillsSkillOwnerEffectsModel
 *
 */

class SkillsSkillOwnerEffectsModel
{

    constructor(id, skill_id, key, property_key, operation, value, minValue, maxValue, minProperty, maxProperty)
    {
        this.id = id;
        this.skill_id = skill_id;
        this.key = key;
        this.property_key = property_key;
        this.operation = operation;
        this.value = value;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.minProperty = minProperty;
        this.maxProperty = maxProperty;
    }

    static get tableName()
    {
        return 'skills_skill_owner_effects';
    }
    

    static get relationTypes()
    {
        return {
            operation_types: 'one',
            skills_skill: 'one',
            skills_skill_owner_effects_conditions: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill': 'skills_skill',
            'related_operation_types': 'operation_types',
            'related_skills_skill_owner_effects_conditions': 'skills_skill_owner_effects_conditions'
        };
    }
}

module.exports.SkillsSkillOwnerEffectsModel = SkillsSkillOwnerEffectsModel;
