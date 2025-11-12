/**
 *
 * Reldens - SkillsLevelsSetModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsLevelsSetModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_levels_set';
    }
    
    static get relationMappings()
    {
        const { SkillsClassPathModel } = require('./skills-class-path-model');
        const { SkillsLevelsModel } = require('./skills-levels-model');
        return {
            related_skills_class_path: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassPathModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassPathModel.tableName+'.levels_set_id'
                }
            },
            related_skills_levels: {
                relation: this.HasManyRelation,
                modelClass: SkillsLevelsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsLevelsModel.tableName+'.level_set_id'
                }
            }
        };
    }
}

module.exports.SkillsLevelsSetModel = SkillsLevelsSetModel;
