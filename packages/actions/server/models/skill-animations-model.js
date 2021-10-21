/**
 *
 * Reldens - SkillAnimationsModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class SkillAnimationsModel extends ModelClass
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
                relation: ModelClass.HasOneRelation,
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
