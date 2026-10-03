/**
 *
 * Reldens - PlayersModel
 *
 */

class PlayersModel
{

    static get tableName()
    {
        return 'players';
    }

    static get relationMappings()
    {
        return {
            related_users: {
                relation: 'BelongsToOneRelation',
                tableName: 'users',
                from: 'user_id',
                to: 'id'
            },
            related_ads_played: {
                relation: 'HasManyRelation',
                tableName: 'ads_played',
                from: 'id',
                to: 'player_id'
            },
            related_audio_player_config: {
                relation: 'HasManyRelation',
                tableName: 'audio_player_config',
                from: 'id',
                to: 'player_id'
            },
            related_chat_player: {
                relation: 'HasManyRelation',
                tableName: 'chat',
                from: 'id',
                to: 'player_id'
            },
            related_chat_private_player: {
                relation: 'HasManyRelation',
                tableName: 'chat',
                from: 'id',
                to: 'private_player_id'
            },
            related_clan: {
                relation: 'HasOneRelation',
                tableName: 'clan',
                from: 'id',
                to: 'owner_id'
            },
            related_clan_members: {
                relation: 'HasOneRelation',
                tableName: 'clan_members',
                from: 'id',
                to: 'player_id'
            },
            related_items_inventory: {
                relation: 'HasManyRelation',
                tableName: 'items_inventory',
                from: 'id',
                to: 'owner_id'
            },
            related_players_state: {
                relation: 'HasOneRelation',
                tableName: 'players_state',
                from: 'id',
                to: 'player_id'
            },
            related_players_stats: {
                relation: 'HasManyRelation',
                tableName: 'players_stats',
                from: 'id',
                to: 'player_id'
            },
            related_rewards_events_state: {
                relation: 'HasManyRelation',
                tableName: 'rewards_events_state',
                from: 'id',
                to: 'player_id'
            },
            related_scores: {
                relation: 'HasManyRelation',
                tableName: 'scores',
                from: 'id',
                to: 'player_id'
            },
            related_scores_detail: {
                relation: 'HasManyRelation',
                tableName: 'scores_detail',
                from: 'id',
                to: 'player_id'
            },
            related_skills_owners_class_path: {
                relation: 'HasManyRelation',
                tableName: 'skills_owners_class_path',
                from: 'id',
                to: 'owner_id'
            }
        };
    }
}

module.exports.PlayersModel = PlayersModel;
