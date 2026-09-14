/**
 *
 * Reldens - SkillsSkillTargetEffectsModel
 *
 */

class SkillsSkillTargetEffectsModel
{

    static get tableName()
    {
        return 'skills_skill_target_effects';
    }

    static get relationMappings()
    {
        return {
            related_skills_skill: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_skill',
                from: 'skill_id',
                to: 'id'
            },
            related_operation_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'operation_types',
                from: 'operation',
                to: 'key'
            },
            related_skills_skill_target_effects_conditions: {
                relation: 'HasManyRelation',
                tableName: 'skills_skill_target_effects_conditions',
                from: 'id',
                to: 'skill_target_effect_id'
            }
        };
    }
}

module.exports.SkillsSkillTargetEffectsModel = SkillsSkillTargetEffectsModel;
