/**
 *
 * Reldens - SkillsSkillOwnerEffectsConditionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillOwnerEffectsConditionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_owner_effects_conditions';
    }
    

    static get relationMappings()
    {
        const { SkillsSkillOwnerEffectsModel } = require('./skills-skill-owner-effects-model');
        return {
            related_skills_skill_owner_effects: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillOwnerEffectsModel,
                join: {
                    from: this.tableName+'.skill_owner_effect_id',
                    to: SkillsSkillOwnerEffectsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SkillsSkillOwnerEffectsConditionsModel = SkillsSkillOwnerEffectsConditionsModel;
