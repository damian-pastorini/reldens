/**
 *
 * Reldens - LevelAnimationsModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class LevelAnimationsModel extends ModelClass
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
                relation: ModelClass.HasOneRelation,
                modelClass: ClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: ClassPathModel.tableName+'.id'
                }
            },
            level: {
                relation: ModelClass.HasOneRelation,
                modelClass: LevelModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: LevelModel.tableName+'.id'
                }
            }
        }
    }

    static loadAllWithClassAndLevel()
    {
        return this.query().withGraphFetched('[class_path, level]');
    }

}

module.exports.LevelAnimationsModel = LevelAnimationsModel;
