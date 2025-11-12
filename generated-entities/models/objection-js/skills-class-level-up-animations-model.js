/**
 *
 * Reldens - SkillsClassLevelUpAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsClassLevelUpAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_class_level_up_animations';
    }
    
    static get relationMappings()
    {
        const { SkillsClassPathModel } = require('./skills-class-path-model');
        const { SkillsLevelsModel } = require('./skills-levels-model');
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
            }
        };
    }
}

module.exports.SkillsClassLevelUpAnimationsModel = SkillsClassLevelUpAnimationsModel;
