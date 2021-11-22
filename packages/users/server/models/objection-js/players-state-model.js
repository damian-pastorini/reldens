/**
 *
 * Reldens - PlayerStateModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class PlayersStateModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'players_state';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        return {
            parent_player: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.PlayersStateModel = PlayersStateModel;
