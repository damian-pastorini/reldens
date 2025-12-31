/**
 *
 * Reldens - ScoresDetailModel
 *
 */

class ScoresDetailModel
{

    constructor(id, player_id, obtained_score, kill_time, kill_player_id, kill_npc_id)
    {
        this.id = id;
        this.player_id = player_id;
        this.obtained_score = obtained_score;
        this.kill_time = kill_time;
        this.kill_player_id = kill_player_id;
        this.kill_npc_id = kill_npc_id;
    }

    static get tableName()
    {
        return 'scores_detail';
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

module.exports.ScoresDetailModel = ScoresDetailModel;
