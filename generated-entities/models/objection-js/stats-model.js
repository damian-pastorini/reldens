/**
 *
 * Reldens - StatsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class StatsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'stats';
    }

    static get relationMappings()
    {
        const { ObjectsStatsModel } = require('./objects-stats-model');
        const { PlayersStatsModel } = require('./players-stats-model');
        return {
            related_objects_stats: {
                relation: this.HasManyRelation,
                modelClass: ObjectsStatsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsStatsModel.tableName+'.stat_id'
                }
            },
            related_players_stats: {
                relation: this.HasManyRelation,
                modelClass: PlayersStatsModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersStatsModel.tableName+'.stat_id'
                }
            }
        };
    }
}

module.exports.StatsModel = StatsModel;
