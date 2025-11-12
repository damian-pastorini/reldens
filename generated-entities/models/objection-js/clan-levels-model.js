/**
 *
 * Reldens - ClanLevelsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ClanLevelsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan_levels';
    }
    
    static get relationMappings()
    {
        const { ClanModel } = require('./clan-model');
        const { ClanLevelsModifiersModel } = require('./clan-levels-modifiers-model');
        return {
            related_clan: {
                relation: this.HasManyRelation,
                modelClass: ClanModel,
                join: {
                    from: this.tableName+'.key',
                    to: ClanModel.tableName+'.level'
                }
            },
            related_clan_levels_modifiers: {
                relation: this.HasManyRelation,
                modelClass: ClanLevelsModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ClanLevelsModifiersModel.tableName+'.level_id'
                }
            }
        };
    }
}

module.exports.ClanLevelsModel = ClanLevelsModel;
