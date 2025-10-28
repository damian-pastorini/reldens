/**
 *
 * Reldens - SkillsSkillAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_animations';
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

module.exports.SkillsSkillAnimationsModel = SkillsSkillAnimationsModel;
