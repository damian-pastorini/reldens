/**
 *
 * Reldens - Skills - LevelModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class LevelModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'levels';
    }

    static get relationMappings()
    {
        const { LevelsSetModel } = require('./levels-set-model');
        const { LevelModifiersModel } = require('./level-modifiers-model');
        return {
            level_set: {
                relation: this.BelongsToOneRelation,
                modelClass: LevelsSetModel,
                join: {
                    from: this.tableName+'.level_set_id',
                    to: LevelsSetModel.tableName+'.id'
                }
            },
            level_modifiers: {
                relation: this.HasManyRelation,
                modelClass: LevelModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: LevelModifiersModel.tableName+'.level_id'
                }
            },
        };
    }

}

module.exports.LevelModel = LevelModel;
