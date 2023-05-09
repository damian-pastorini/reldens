/**
 *
 * Reldens - ClanLevelsModifiersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ClanLevelsModifiersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan_levels_modifiers';
    }

    static get relationMappings()
    {
        const { ClanLevelsModel } = require('./clan-levels-model');
        return {
            parent_level: {
                relation: this.HasOneRelation,
                modelClass: ClanLevelsModel,
                join: {
                    from: this.tableName+'.level_id',
                    to: ClanLevelsModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.ClanLevelsModifiersModel = ClanLevelsModifiersModel;
