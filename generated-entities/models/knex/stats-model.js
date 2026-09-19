/**
 *
 * Reldens - StatsModel
 *
 */

class StatsModel
{

    static get tableName()
    {
        return 'stats';
    }

    static get relationMappings()
    {
        return {
            related_objects_stats: {
                relation: 'HasManyRelation',
                tableName: 'objects_stats',
                from: 'id',
                to: 'stat_id'
            },
            related_players_stats: {
                relation: 'HasManyRelation',
                tableName: 'players_stats',
                from: 'id',
                to: 'stat_id'
            }
        };
    }
}

module.exports.StatsModel = StatsModel;
