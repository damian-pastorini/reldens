/**
 *
 * Reldens - PlayersStatsModel
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
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            related_stats: {
                relation: this.BelongsToOneRelation,
                modelClass: StatsModel,
                join: {
                    from: this.tableName+'.stat_id',
                    to: StatsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.PlayersStatsModel = PlayersStatsModel;
