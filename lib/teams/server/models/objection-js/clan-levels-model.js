/**
 *
 * Reldens - ClanLevelsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const {PlayersModel} = require("../../../../users/server/models/objection-js/players-model");

class ClanLevelsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan_levels';
    }

    static get relationMappings()
    {
        let { ClanLevelsModifiersModel } = require('./clan-levels-modifiers-model');
        return {
            modifiers: {
                relation: this.HasManyRelation,
                modelClass: ClanLevelsModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ClanLevelsModifiersModel.tableName+'.level_id'
                }
            }
        }
    }

}

module.exports.ClanLevelsModel = ClanLevelsModel;
