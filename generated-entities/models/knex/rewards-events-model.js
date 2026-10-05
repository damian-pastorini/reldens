/**
 *
 * Reldens - RewardsEventsModel
 *
 */

class RewardsEventsModel
{

    static get tableName()
    {
        return 'rewards_events';
    }

    static get relationMappings()
    {
        return {
            related_rewards_events_state: {
                relation: 'HasManyRelation',
                tableName: 'rewards_events_state',
                from: 'id',
                to: 'rewards_events_id'
            }
        };
    }
}

module.exports.RewardsEventsModel = RewardsEventsModel;
