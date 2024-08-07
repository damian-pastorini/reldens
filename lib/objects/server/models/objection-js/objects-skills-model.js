/**
 *
 * Reldens - ObjectsSkillsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsSkillsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_skills';
    }

    static get relationMappings()
    {
        const { SkillModel } = require('@reldens/skills/lib/server/storage/models/objection-js/skill-model');
        const { ObjectsModel } = require('./objects-model');
        const { TargetOptionsModel } = require('./target-options-model');
        return {
            object: {
                relation: this.HasOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            skill: {
                relation: this.HasOneRelation,
                modelClass: SkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillModel.tableName+'.id'
                }
            },
            target: {
                relation: this.HasOneRelation,
                modelClass: TargetOptionsModel,
                join: {
                    from: this.tableName+'.target_id',
                    to: TargetOptionsModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.ObjectsSkillsModel = ObjectsSkillsModel;
