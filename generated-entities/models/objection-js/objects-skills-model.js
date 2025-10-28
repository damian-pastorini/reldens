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
        const { ObjectsModel } = require('./objects-model');
        const { SkillsSkillModel } = require('./skills-skill-model');
        const { TargetOptionsModel } = require('./target-options-model');
        return {
            related_objects: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            },
            related_skills_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillsSkillModel.tableName+'.id'
                }
            },
            related_target_options: {
                relation: this.BelongsToOneRelation,
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
