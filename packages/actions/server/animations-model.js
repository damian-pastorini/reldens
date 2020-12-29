/**
 *
 * Reldens - AnimationModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class AnimationsModel extends ModelClass
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

    static loadAllWithSkill()
    {
        return this.query().withGraphFetched('skill');
    }

}

module.exports.AnimationsModel = AnimationsModel;
