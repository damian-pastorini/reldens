/**
 *
 * Reldens - Skills - ClassPathLevelSkillsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class ClassPathLevelSkillsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'class_path_level_skills';
    }

    static get relationMappings()
    {
        const { ClassPathModel } = require('./class-path-model');
        const { LevelModel } = require('./level-model');
        const { SkillModel } = require('./skill-model');
        return {
            class_path: {
                relation: this.BelongsToOneRelation,
                modelClass: ClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: ClassPathModel.tableName+'.id'
                }
            },
            class_path_level: {
                relation: this.BelongsToOneRelation,
                modelClass: LevelModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: LevelModel.tableName+'.id'
                }
            },
            class_path_level_skill: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillModel,
                join: {
                    from: this.tableName+'.skill_id',
                    to: SkillModel.tableName+'.id'
                }
            },
        };
    }

}

module.exports.ClassPathLevelSkillsModel = ClassPathLevelSkillsModel;
