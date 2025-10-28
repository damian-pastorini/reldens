/**
 *
 * Reldens - SkillsSkillTargetEffectsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillTargetEffectsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_target_effects';
    }
    

    static get relationMappings()
    {
        const { SkillsSkillModel } = require('./skills-skill-model');
        const { OperationTypesModel } = require('./operation-types-model');
        const { SkillsSkillTargetEffectsConditionsModel } = require('./skills-skill-target-effects-conditions-model');
        return {
            related_skills_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillsSkillModel.tableName+'.id'
                }
            },
            related_operation_types: {
                relation: this.BelongsToOneRelation,
                modelClass: OperationTypesModel,
                join: {
                    from: this.tableName+'.operation',
                    to: OperationTypesModel.tableName+'.key'
                }
            },
            related_skills_skill_target_effects_conditions: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillTargetEffectsConditionsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillTargetEffectsConditionsModel.tableName+'.skill_target_effect_id'
                }
            }
        };
    }
}

module.exports.SkillsSkillTargetEffectsModel = SkillsSkillTargetEffectsModel;
