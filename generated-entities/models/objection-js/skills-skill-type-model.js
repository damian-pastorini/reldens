/**
 *
 * Reldens - SkillsSkillTypeModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillTypeModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_type';
    }
    
    static get relationMappings()
    {
        const { SkillsSkillModel } = require('./skills-skill-model');
        return {
            related_skills_skill: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillModel.tableName+'.type'
                }
            }
        };
    }
}

module.exports.SkillsSkillTypeModel = SkillsSkillTypeModel;
