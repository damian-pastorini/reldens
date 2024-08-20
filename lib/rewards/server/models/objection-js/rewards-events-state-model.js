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
        const { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        return {
            parent_rewards_events: {
                relation: this.HasOneRelation,
                modelClass: RewardsEventsModel,
                join: {
                    from: this.tableName + '.rewards_events_id',
                    to: RewardsEventsModel.tableName + '.id'
                }
            },
            parent_player: {
                relation: this.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName + '.player_id',
                    to: PlayersModel.tableName + '.id'
                }
            }
        };
    }

}

module.exports.RewardsEventsStateModel = RewardsEventsStateModel;
