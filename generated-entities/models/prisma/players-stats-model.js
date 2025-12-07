/**
 *
 * Reldens - PlayersStatsModel
 *
 */

class PlayersStatsModel
{

    constructor(id, player_id, stat_id, base_value, value)
    {
        this.id = id;
        this.player_id = player_id;
        this.stat_id = stat_id;
        this.base_value = base_value;
        this.value = value;
    }

    static get tableName()
    {
        return 'players_stats';
    }
    

    static get relationTypes()
    {
        return {
            players: 'one',
            stats: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players',
            'related_stats': 'stats'
        };
    }
}

module.exports.PlayersStatsModel = PlayersStatsModel;
