/**
 *
 * Reldens - PlayersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class PlayersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'players';
    }
    

    static get relationMappings()
    {
        const { UsersModel } = require('./users-model');
        const { AdsPlayedModel } = require('./ads-played-model');
        const { AudioPlayerConfigModel } = require('./audio-player-config-model');
        const { ChatModel } = require('./chat-model');
        const { ClanModel } = require('./clan-model');
        const { ClanMembersModel } = require('./clan-members-model');
        const { ItemsInventoryModel } = require('./items-inventory-model');
        const { PlayersStateModel } = require('./players-state-model');
        const { PlayersStatsModel } = require('./players-stats-model');
        const { RewardsEventsStateModel } = require('./rewards-events-state-model');
        const { ScoresDetailModel } = require('./scores-detail-model');
        const { SkillsOwnersClassPathModel } = require('./skills-owners-class-path-model');
        return {
            related_users: {
                relation: this.BelongsToOneRelation,
                modelClass: UsersModel,
                join: {
                    from: this.tableName+'.user_id',
                    to: UsersModel.tableName+'.id'
                }
            },
            related_ads_played: {
                relation: this.HasManyRelation,
                modelClass: AdsPlayedModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsPlayedModel.tableName+'.player_id'
                }
            },
            related_audio_player_config: {
                relation: this.HasManyRelation,
                modelClass: AudioPlayerConfigModel,
                join: {
                    from: this.tableName+'.id',
                    to: AudioPlayerConfigModel.tableName+'.player_id'
                }
            },
            related_chat: {
                relation: this.HasManyRelation,
                modelClass: ChatModel,
                join: {
                    from: this.tableName+'.id',
                    to: ChatModel.tableName+'.private_player_id'
                }
            },
            related_clan: {
                relation: this.HasManyRelation,
                modelClass: ClanModel,
                join: {
                    from: this.tableName+'.id',
                    to: ClanModel.tableName+'.owner_id'
                }
            },
            related_clan_members: {
                relation: this.HasManyRelation,
                modelClass: ClanMembersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ClanMembersModel.tableName+'.player_id'
                }
            },
            related_items_inventory: {
                relation: this.HasManyRelation,
                modelClass: ItemsInventoryModel,
                join: {
                    from: this.tableName+'.id',
                    to: ItemsInventoryModel.tableName+'.owner_id'
                }
            },
            related_players_state: {
                relation: this.HasManyRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersStateModel.tableName+'.player_id'
                }
            },
            related_players_stats: {
                relation: this.HasManyRelation,
                modelClass: PlayersStatsModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersStatsModel.tableName+'.player_id'
                }
            },
            related_rewards_events_state: {
                relation: this.HasManyRelation,
                modelClass: RewardsEventsStateModel,
                join: {
                    from: this.tableName+'.id',
                    to: RewardsEventsStateModel.tableName+'.player_id'
                }
            },
            related_scores_detail: {
                relation: this.HasManyRelation,
                modelClass: ScoresDetailModel,
                join: {
                    from: this.tableName+'.id',
                    to: ScoresDetailModel.tableName+'.player_id'
                }
            },
            related_skills_owners_class_path: {
                relation: this.HasManyRelation,
                modelClass: SkillsOwnersClassPathModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsOwnersClassPathModel.tableName+'.owner_id'
                }
            }
        };
    }
}

module.exports.PlayersModel = PlayersModel;
