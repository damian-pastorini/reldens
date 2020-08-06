/**
 *
 * Reldens - PlayersModel
 *
 * Players storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class PlayersModel extends Model
{

    static get tableName()
    {
        return 'players';
    }

    static get relationMappings()
    {
        const { UsersModel } = require('./model');
        const { PlayersStatsModel } = require('./players-stats-model');
        const { PlayersStateModel } = require('./players-state-model');
        return {
            parent_user: {
                relation: Model.BelongsToOneRelation,
                modelClass: UsersModel,
                join: {
                    from: 'players.user_id',
                    to: 'users.id'
                }
            },
            stats: {
                relation: Model.HasOneRelation,
                modelClass: PlayersStatsModel,
                join: {
                    from: 'players.id',
                    to: 'players_stats.player_id'
                }
            },
            state: {
                relation: Model.HasOneRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: 'players.id',
                    to: 'players_state.player_id'
                }
            }
        }
    }

}

module.exports.PlayersModel = PlayersModel;
