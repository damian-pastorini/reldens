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
            ads_played: 'many',
            audio_player_config: 'many',
            chat_chat_player_idToplayers: 'many',
            chat_chat_private_player_idToplayers: 'many',
            clan: 'one',
            clan_members: 'one',
            items_inventory: 'many',
            users: 'one',
            players_state: 'one',
            players_stats: 'many',
            rewards_events_state: 'many',
            scores: 'many',
            scores_detail: 'many',
            skills_owners_class_path: 'many'
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
