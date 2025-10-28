/**
 *
 * Reldens - SkillsGroupsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsGroupsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_groups';
    }
    

    static get relationMappings()
    {
        const { SkillsSkillGroupRelationModel } = require('./skills-skill-group-relation-model');
        return {
            related_skills_skill_group_relation: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillGroupRelationModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillGroupRelationModel.tableName+'.group_id'
                }
            }
        };
    }
}

module.exports.SkillsGroupsModel = SkillsGroupsModel;
