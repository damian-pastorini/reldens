/**
 *
 * Reldens - ScoresModel
 *
 */

class ScoresModel
{

    constructor(id, player_id, total_score, players_kills_count, npcs_kills_count, last_player_kill_time, last_npc_kill_time, created_at, updated_at)
    {
        this.id = id;
        this.player_id = player_id;
        this.total_score = total_score;
        this.players_kills_count = players_kills_count;
        this.npcs_kills_count = npcs_kills_count;
        this.last_player_kill_time = last_player_kill_time;
        this.last_npc_kill_time = last_npc_kill_time;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'scores';
    }
    

    static get relationTypes()
    {
        return {
            players: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players'
        };
    }
}

module.exports.ScoresModel = ScoresModel;
