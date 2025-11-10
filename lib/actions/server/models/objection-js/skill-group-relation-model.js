/**
 *
 * Reldens - Skills - SkillGroupRelationModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class SkillGroupRelationModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'skill_group_relation';
    }

    static get relationMappings()
    {
        const { SkillModel } = require('./skill-model');
        const { SkillsGroupsModel } = require('./skills-groups-model');
        return {
            parent_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillModel.tableName+'.id'
                }
            },
            parent_group: {
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

module.exports.SkillGroupRelationModel = SkillGroupRelationModel;
