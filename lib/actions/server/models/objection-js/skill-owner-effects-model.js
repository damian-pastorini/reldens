/**
 *
 * Reldens - Skills - SkillOwnerEffectsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class SkillOwnerEffectsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'skill_owner_effects';
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

module.exports.SkillOwnerEffectsModel = SkillOwnerEffectsModel;
