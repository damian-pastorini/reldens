/**
 *
 * Reldens - SkillsLevelsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsLevelsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_levels';
    }
    

    static get relationMappings()
    {
        const { SkillsLevelsSetModel } = require('./skills-levels-set-model');
        const { SkillsClassLevelUpAnimationsModel } = require('./skills-class-level-up-animations-model');
        const { SkillsClassPathLevelLabelsModel } = require('./skills-class-path-level-labels-model');
        const { SkillsClassPathLevelSkillsModel } = require('./skills-class-path-level-skills-model');
        const { SkillsLevelsModifiersModel } = require('./skills-levels-modifiers-model');
        return {
            related_skills_levels_set: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsLevelsSetModel,
                join: {
                    from: this.tableName+'.level_set_id',
                    to: SkillsLevelsSetModel.tableName+'.id'
                }
            },
            related_skills_class_level_up_animations: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassLevelUpAnimationsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassLevelUpAnimationsModel.tableName+'.level_id'
                }
            },
            related_skills_class_path_level_labels: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassPathLevelLabelsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassPathLevelLabelsModel.tableName+'.level_id'
                }
            },
            related_skills_class_path_level_skills: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassPathLevelSkillsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassPathLevelSkillsModel.tableName+'.level_id'
                }
            },
            related_skills_levels_modifiers: {
                relation: this.HasManyRelation,
                modelClass: SkillsLevelsModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsLevelsModifiersModel.tableName+'.level_id'
                }
            }
        };
    }
}

module.exports.SkillsLevelsModel = SkillsLevelsModel;
