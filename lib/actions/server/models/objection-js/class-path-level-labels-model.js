/**
 *
 * Reldens - Skills - ClassPathLevelLabelsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class ClassPathLevelLabelsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'class_path_level_labels';
    }

    static get relationMappings()
    {
        const { ClassPathModel } = require('./class-path-model');
        const { LevelModel } = require('./level-model');
        return {
            class_path: {
                relation: this.BelongsToOneRelation,
                modelClass: ClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: ClassPathModel.tableName+'.id'
                }
            },
            label_level: {
                relation: this.BelongsToOneRelation,
                modelClass: LevelModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: LevelModel.tableName+'.id'
                }
            }
        };
    }

}

module.exports.ClassPathLevelLabelsModel = ClassPathLevelLabelsModel;
