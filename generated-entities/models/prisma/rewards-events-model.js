/**
 *
 * Reldens - RewardsEventsModel
 *
 */

class RewardsEventsModel
{

    constructor(id, label, description, handler_key, event_key, event_data, position, enabled, active_from, active_to)
    {
        this.id = id;
        this.label = label;
        this.description = description;
        this.handler_key = handler_key;
        this.event_key = event_key;
        this.event_data = event_data;
        this.position = position;
        this.enabled = enabled;
        this.active_from = active_from;
        this.active_to = active_to;
    }

    static get tableName()
    {
        return 'rewards_events';
    }
    

    static get relationTypes()
    {
        return {
            rewards_events_state: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_rewards_events_state': 'rewards_events_state'
        };
    }
}

module.exports.RewardsEventsModel = RewardsEventsModel;
