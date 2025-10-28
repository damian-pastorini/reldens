/**
 *
 * Reldens - SkillsSkillGroupRelationModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillGroupRelationModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_group_relation';
    }
    

    static get relationMappings()
    {
        const { SkillsSkillModel } = require('./skills-skill-model');
        const { SkillsGroupsModel } = require('./skills-groups-model');
        return {
            related_skills_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillsSkillModel.tableName+'.id'
                }
            },
            related_skills_groups: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsGroupsModel,
                join: {
                    from: this.tableName+'.group_id',
                    to: SkillsGroupsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SkillsSkillGroupRelationModel = SkillsSkillGroupRelationModel;
