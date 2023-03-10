/**
 *
 * Reldens - ClanModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const {PlayersModel} = require("../../../../users/server/models/objection-js/players-model");

class ClanModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'clan';
    }

    static get relationMappings()
    {
        let { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        let { ClanLevelsModel } = require('./clan-levels-model');
        return {
            player_owner: {
                relation: this.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.owner_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            parent_level: {
                relation: this.HasOneRelation,
                modelClass: ClanLevelsModel,
                join: {
                    from: this.tableName+'.level',
                    to: ClanLevelsModel.tableName+'.key'
                }
            }
        }
    }

}

module.exports.ClanModel = ClanModel;
