/**
 *
 * Reldens - Skills - SkillAttackModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class SkillAttackModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'skill_attack';
    }

    static get relationMappings()
    {
        const { SkillModel } = require('./skill-model');
        return {
            parent_skill: {
                relation: this.HasOneRelation,
                modelClass: SkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.SkillAttackModel = SkillAttackModel;
