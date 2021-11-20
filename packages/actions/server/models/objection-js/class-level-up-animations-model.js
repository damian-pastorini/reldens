/**
 *
 * Reldens - ClassLevelUpAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ClassLevelUpAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_class_level_up_animations';
    }

    static get relationMappings()
    {
        const { ClassPathModel } = require('@reldens/skills/lib/server/storage/models/objection-js/class-path-model');
        const { LevelModel } = require('@reldens/skills/lib/server/storage/models/objection-js/level-model');
        return {
            class_path: {
                relation: this.HasOneRelation,
                modelClass: ClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: ClassPathModel.tableName+'.id'
                }
            },
            level: {
                relation: this.HasOneRelation,
                modelClass: LevelModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: LevelModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.ClassLevelUpAnimationsModel = ClassLevelUpAnimationsModel;
