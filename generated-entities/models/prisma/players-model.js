/**
 *
 * Reldens - PlayersModel
 *
 */

class PlayersModel
{

    constructor(id, user_id, name, created_at, updated_at)
    {
        this.id = id;
        this.user_id = user_id;
        this.name = name;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'players';
    }


    static get relationTypes()
    {
        return {
            ads_played: 'one',
            audio_player_config: 'one',
            chat_chat_player_idToplayers: 'one',
            chat_chat_private_player_idToplayers: 'one',
            clan: 'one',
            clan_members: 'one',
            items_inventory: 'one',
            users: 'one',
            players_state: 'one',
            players_stats: 'one',
            rewards_events_state: 'one',
            scores: 'one',
            scores_detail: 'one',
            skills_owners_class_path: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_users': 'users',
            'related_ads_played': 'ads_played',
            'related_audio_player_config': 'audio_player_config',
            'related_chat_player': 'chat_chat_player_idToplayers',
            'related_chat_private_player': 'chat_chat_private_player_idToplayers',
            'related_clan': 'clan',
            'related_clan_members': 'clan_members',
            'related_items_inventory': 'items_inventory',
            'related_players_state': 'players_state',
            'related_players_stats': 'players_stats',
            'related_rewards_events_state': 'rewards_events_state',
            'related_scores': 'scores',
            'related_scores_detail': 'scores_detail',
            'related_skills_owners_class_path': 'skills_owners_class_path'
        };
    }
}

module.exports.PlayersModel = PlayersModel;
