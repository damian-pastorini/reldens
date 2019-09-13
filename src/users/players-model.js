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
        // to avoid require loop:
        const Users = require('./model');
        const PlayersStats = require('./players-stats-model');
        const PlayersState = require('./players-state-model');
        return {
            parent_user: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'players.user_id',
                    to: 'users.id'
                }
            },
            stats: {
                relation: Model.HasOneRelation,
                modelClass: PlayersStats,
                join: {
                    from: 'players.id',
                    to: 'players_stats.player_id'
                }
            },
            state: {
                relation: Model.HasOneRelation,
                modelClass: PlayersState,
                join: {
                    from: 'players.id',
                    to: 'players_state.player_id'
                }
            }
        }
    }

}

module.exports = PlayersModel;
