/**
 *
 * Reldens - SkillsSkillOwnerEffectsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillOwnerEffectsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_owner_effects';
    }
    
    static get relationMappings()
    {
        const { SkillsSkillModel } = require('./skills-skill-model');
        const { OperationTypesModel } = require('./operation-types-model');
        const { SkillsSkillOwnerEffectsConditionsModel } = require('./skills-skill-owner-effects-conditions-model');
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
            related_skills_skill_owner_effects_conditions: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillOwnerEffectsConditionsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillOwnerEffectsConditionsModel.tableName+'.skill_owner_effect_id'
                }
            }
        };
    }
}

module.exports.SkillsSkillOwnerEffectsModel = SkillsSkillOwnerEffectsModel;
