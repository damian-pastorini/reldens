/**
 *
 * Reldens - SkillsClassPathModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsClassPathModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_class_path';
    }
    
    static get relationMappings()
    {
        const { SkillsLevelsSetModel } = require('./skills-levels-set-model');
        const { SkillsClassLevelUpAnimationsModel } = require('./skills-class-level-up-animations-model');
        const { SkillsClassPathLevelLabelsModel } = require('./skills-class-path-level-labels-model');
        const { SkillsClassPathLevelSkillsModel } = require('./skills-class-path-level-skills-model');
        const { SkillsOwnersClassPathModel } = require('./skills-owners-class-path-model');
        return {
            related_skills_levels_set: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsLevelsSetModel,
                join: {
                    from: this.tableName+'.levels_set_id',
                    to: SkillsLevelsSetModel.tableName+'.id'
                }
            },
            related_skills_class_level_up_animations: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassLevelUpAnimationsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassLevelUpAnimationsModel.tableName+'.class_path_id'
                }
            },
            related_skills_class_path_level_labels: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassPathLevelLabelsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassPathLevelLabelsModel.tableName+'.class_path_id'
                }
            },
            related_skills_class_path_level_skills: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassPathLevelSkillsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassPathLevelSkillsModel.tableName+'.class_path_id'
                }
            },
            related_skills_owners_class_path: {
                relation: this.HasManyRelation,
                modelClass: SkillsOwnersClassPathModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsOwnersClassPathModel.tableName+'.class_path_id'
                }
            }
        };
    }
}

module.exports.SkillsClassPathModel = SkillsClassPathModel;
