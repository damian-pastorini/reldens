/**
 *
 * Reldens - SkillsSkillTargetEffectsConditionsModel
 *
 */

class SkillsSkillTargetEffectsConditionsModel
{

    static get tableName()
    {
        return 'skills_skill_target_effects_conditions';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill_target_effects: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill_target_effects',
                from: 'skill_target_effect_id',
                to: 'id'
            }
        };
    }
}

module.exports.SkillsSkillTargetEffectsConditionsModel = SkillsSkillTargetEffectsConditionsModel;
