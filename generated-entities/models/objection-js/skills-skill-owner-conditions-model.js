/**
 *
 * Reldens - SkillsSkillOwnerConditionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillOwnerConditionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_owner_conditions';
    }
    

    static get relationMappings()
    {
        const { SkillsSkillModel } = require('./skills-skill-model');
        return {
            related_skills_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillsSkillModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SkillsSkillOwnerConditionsModel = SkillsSkillOwnerConditionsModel;
