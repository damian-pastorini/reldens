/**
 *
 * Reldens - PlayersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, user_id, name, created_at, updated_at} = props;
        return new this(id, user_id, name, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: PlayersModel,
    tableName: 'players',
    properties: {
        id: { type: 'number', primary: true },
        user_id: { type: 'number', persist: false },
        name: { type: 'string' },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_users: {
            kind: 'm:1',
            entity: 'UsersModel',
            joinColumn: 'user_id'
        },
        related_ads_played: {
            kind: '1:m',
            entity: 'AdsPlayedModel',
            mappedBy: 'related_players'
        },
        related_audio_player_config: {
            kind: '1:m',
            entity: 'AudioPlayerConfigModel',
            mappedBy: 'related_players'
        },
        related_chat_player: {
            kind: '1:m',
            entity: 'ChatModel',
            mappedBy: 'related_players_player'
        },
        related_chat_private_player: {
            kind: '1:m',
            entity: 'ChatModel',
            mappedBy: 'related_players_player'
        },
        related_clan: {
            kind: '1:1',
            entity: 'ClanModel',
            mappedBy: 'related_players'
        },
        related_clan_members: {
            kind: '1:1',
            entity: 'ClanMembersModel',
            mappedBy: 'related_players'
        },
        related_items_inventory: {
            kind: '1:m',
            entity: 'ItemsInventoryModel',
            mappedBy: 'related_players'
        },
        related_players_state: {
            kind: '1:1',
            entity: 'PlayersStateModel',
            mappedBy: 'related_players'
        },
        related_players_stats: {
            kind: '1:m',
            entity: 'PlayersStatsModel',
            mappedBy: 'related_players'
        },
        related_rewards_events_state: {
            kind: '1:m',
            entity: 'RewardsEventsStateModel',
            mappedBy: 'related_players'
        },
        related_scores: {
            kind: '1:m',
            entity: 'ScoresModel',
            mappedBy: 'related_players'
        },
        related_scores_detail: {
            kind: '1:m',
            entity: 'ScoresDetailModel',
            mappedBy: 'related_players'
        },
        related_skills_owners_class_path: {
            kind: '1:m',
            entity: 'SkillsOwnersClassPathModel',
            mappedBy: 'related_players'
        }
    },
});
schema._fkMappings = {
    "user_id": {
        "relationKey": "related_users",
        "entityName": "UsersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    PlayersModel,
    entity: PlayersModel,
    schema: schema
};
