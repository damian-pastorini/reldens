/**
 *
 * Reldens - PlayersStatsModel
 *
 */

class PlayersStatsModel
{

    static get tableName()
    {
        return 'players_stats';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            },
            related_stats: {
                relation: 'BelongsToOneRelation',
                tableName: 'stats',
                from: 'stat_id',
                to: 'id'
            }
        };
    }
}

module.exports.PlayersStatsModel = PlayersStatsModel;
