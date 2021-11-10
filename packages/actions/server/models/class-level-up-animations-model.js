/**
 *
 * Reldens - ClassLevelUpAnimationsModel
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');

class ClassLevelUpAnimationsModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'skills_class_level_up_animations';
    }

    static get relationMappings()
    {
        const { ClassPathModel } = require('@reldens/skills/lib/server/storage/models/class-path');
        const { LevelModel } = require('@reldens/skills/lib/server/storage/models/level');
        return {
            class_path: {
                relation: ClassLevelUpAnimationsModel.HasOneRelation,
                modelClass: ClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: ClassPathModel.tableName+'.id'
                }
            },
            level: {
                relation: ClassLevelUpAnimationsModel.HasOneRelation,
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
