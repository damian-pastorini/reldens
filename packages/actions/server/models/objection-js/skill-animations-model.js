/**
 *
 * Reldens - SkillAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill_animations';
    }

    static get relationMappings()
    {
        const { SkillModel } = require('@reldens/skills/lib/server/storage/models/objection-js/skill-model');
        return {
            skill: {
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

module.exports.SkillAnimationsModel = SkillAnimationsModel;
