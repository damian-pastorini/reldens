/**
 *
 * Reldens - TargetOptionsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class TargetOptionsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'target_options';
    }

    static get relationMappings()
    {
        const { ObjectsSkillsModel } = require('./objects-skills-model');
        return {
            related_objects_skills: {
                relation: this.HasManyRelation,
                modelClass: ObjectsSkillsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsSkillsModel.tableName+'.target_id'
                }
            }
        };
    }
}

module.exports.TargetOptionsModel = TargetOptionsModel;
