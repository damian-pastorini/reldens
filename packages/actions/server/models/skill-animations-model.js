/**
 *
 * Reldens - SkillAnimationsModel
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');

class SkillAnimationsModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'skills_skill_animations';
    }

    static get relationMappings()
    {
        const { SkillModel } = require('@reldens/skills/lib/server/storage/models/skill');
        return {
            skill: {
                relation: SkillAnimationsModel.HasOneRelation,
                modelClass: SkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.SkillAnimationsModel = SkillAnimationsModel;
