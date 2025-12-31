/**
 *
 * Reldens - SkillsSkillTargetEffectsConditionsModel
 *
 */

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

    static get tableName()
    {
        return 'skills_skill_target_effects_conditions';
    }
    

    static get relationTypes()
    {
        return {
            skills_skill_target_effects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill_target_effects': 'skills_skill_target_effects'
        };
    }
}

module.exports.SkillsSkillTargetEffectsConditionsModel = SkillsSkillTargetEffectsConditionsModel;
