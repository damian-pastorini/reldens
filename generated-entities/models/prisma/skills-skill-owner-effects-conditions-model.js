/**
 *
 * Reldens - SkillsSkillOwnerEffectsConditionsModel
 *
 */

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

    static get tableName()
    {
        return 'skills_skill_owner_effects_conditions';
    }
    

    static get relationTypes()
    {
        return {
            skills_skill_owner_effects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill_owner_effects': 'skills_skill_owner_effects'
        };
    }
}

module.exports.SkillsSkillOwnerEffectsConditionsModel = SkillsSkillOwnerEffectsConditionsModel;
