/**
 *
 * Reldens - PlayerStateModel
 *
 * Players state storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class PlayersStateModel extends Model
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
                relation: Model.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'players_state.player_id',
                    to: 'players.id'
                }
            }
        }
    }

}

module.exports.PlayersStateModel = PlayersStateModel;
