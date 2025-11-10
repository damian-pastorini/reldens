/**
 *
 * Reldens - Skills - SkillOwnerConditionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class SkillOwnerConditionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'skill_owner_conditions';
    }

    static get relationMappings()
    {
        const { SkillModel } = require('./skill-model');
        return {
            parent_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.SkillOwnerConditionsModel = SkillOwnerConditionsModel;
