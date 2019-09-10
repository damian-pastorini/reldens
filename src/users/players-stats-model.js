/**
 *
 * Reldens - PlayerStatsModel
 *
 * Players stats storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class PlayersStatsModel extends Model
{

    static get tableName()
    {
        return 'players_stats';
    }

    static get relationMappings()
    {
        // to avoid require loop:
        const Players = require('./players-model');
        return {
            parent_player: {
                relation: Model.BelongsToOneRelation,
                modelClass: Players,
                join: {
                    from: 'players_stats.player_id',
                    to: 'players.id'
                }
            }
        }
    }

}

module.exports = PlayersStatsModel;
