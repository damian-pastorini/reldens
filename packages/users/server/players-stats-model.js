/**
 *
 * Reldens - PlayersStatsModel
 *
 * Players stats storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');

class PlayersStatsModel extends ModelClass
{

    static get tableName()
    {
        return 'players_stats';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        const { StatsModel } = require('./stats-model');
        return {
            parent_player: {
                relation: ModelClass.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'players_stats.player_id',
                    to: 'players.id'
                }
            },
            parent_stat: {
                relation: ModelClass.HasOneRelation,
                modelClass: StatsModel,
                join: {
                    from: 'players_stats.stat_id',
                    to: 'stats.id'
                }
            }
        }
    }

}

module.exports.PlayersStatsModel = PlayersStatsModel;
