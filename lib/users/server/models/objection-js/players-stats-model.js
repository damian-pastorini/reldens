/**
 *
 * Reldens - PlayersStatsModel
 *
 * Players stats storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class PlayersStatsModel extends ObjectionJsRawModel
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
                relation: this.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            parent_stat: {
                relation: this.HasOneRelation,
                modelClass: StatsModel,
                join: {
                    from: this.tableName+'.stat_id',
                    to: StatsModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.PlayersStatsModel = PlayersStatsModel;
