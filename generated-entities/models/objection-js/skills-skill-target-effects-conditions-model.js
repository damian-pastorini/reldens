/**
 *
 * Reldens - SkillsSkillTargetEffectsConditionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillTargetEffectsConditionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_target_effects_conditions';
    }
    
    static get relationMappings()
    {
        const { SkillsSkillTargetEffectsModel } = require('./skills-skill-target-effects-model');
        return {
            related_skills_skill_target_effects: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillTargetEffectsModel,
                join: {
                    from: this.tableName+'.skill_target_effect_id',
                    to: SkillsSkillTargetEffectsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SkillsSkillTargetEffectsConditionsModel = SkillsSkillTargetEffectsConditionsModel;
