/**
 *
 * Reldens - SkillsClassPathLevelSkillsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsClassPathLevelSkillsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_class_path_level_skills';
    }

    static get relationMappings()
    {
        const { SkillsClassPathModel } = require('./skills-class-path-model');
        const { SkillsLevelsModel } = require('./skills-levels-model');
        const { SkillsSkillModel } = require('./skills-skill-model');
        return {
            related_skills_class_path: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: SkillsClassPathModel.tableName+'.id'
                }
            },
            related_skills_levels: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsLevelsModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: SkillsLevelsModel.tableName+'.id'
                }
            },
            related_skills_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillsSkillModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SkillsClassPathLevelSkillsModel = SkillsClassPathLevelSkillsModel;
