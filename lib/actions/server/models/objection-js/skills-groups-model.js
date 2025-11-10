/**
 *
 * Reldens - Skills - SkillsGroupsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class SkillsGroupsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'groups';
    }

    static get relationMappings()
    {
        const { SkillGroupRelationModel } = require('./skill-group-relation-model');
        return {
            parent_group: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillGroupRelationModel,
                join: {
                    from: this.tableName+'.group_id',
                    to: SkillGroupRelationModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.SkillsGroupsModel = SkillsGroupsModel;
