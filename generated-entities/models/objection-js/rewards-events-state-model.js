/**
 *
 * Reldens - RewardsEventsStateModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RewardsEventsStateModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rewards_events_state';
    }

    static get relationMappings()
    {
        const { RewardsEventsModel } = require('./rewards-events-model');
        const { PlayersModel } = require('./players-model');
        return {
            related_rewards_events: {
                relation: this.BelongsToOneRelation,
                modelClass: RewardsEventsModel,
                join: {
                    from: this.tableName+'.rewards_events_id',
                    to: RewardsEventsModel.tableName+'.id'
                }
            },
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.RewardsEventsStateModel = RewardsEventsStateModel;
