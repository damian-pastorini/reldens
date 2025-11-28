/**
 *
 * Reldens - RewardsEventsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RewardsEventsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rewards_events';
    }

    static get relationMappings()
    {
        const { RewardsEventsStateModel } = require('./rewards-events-state-model');
        return {
            related_rewards_events_state: {
                relation: this.HasManyRelation,
                modelClass: RewardsEventsStateModel,
                join: {
                    from: this.tableName+'.id',
                    to: RewardsEventsStateModel.tableName+'.rewards_events_id'
                }
            }
        };
    }
}

module.exports.RewardsEventsModel = RewardsEventsModel;
