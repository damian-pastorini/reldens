/**
 *
 * Reldens - RewardsEventsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, label, description, handler_key, event_key, event_data, position, enabled, active_from, active_to} = props;
        return new this(id, label, description, handler_key, event_key, event_data, position, enabled, active_from, active_to);
    }
    
}

const schema = new EntitySchema({
    class: RewardsEventsModel,
    tableName: 'rewards_events',
    properties: {
        id: { type: 'number', primary: true },
        label: { type: 'string' },
        description: { type: 'string', nullable: true },
        handler_key: { type: 'string' },
        event_key: { type: 'string' },
        event_data: { type: 'string' },
        position: { type: 'number', nullable: true },
        enabled: { type: 'number', nullable: true },
        active_from: { type: 'Date', nullable: true },
        active_to: { type: 'Date', nullable: true },
        related_rewards_events_state: {
            kind: '1:m',
            entity: 'RewardsEventsStateModel',
            mappedBy: 'related_rewards_events'
        }
    },
});

module.exports = {
    RewardsEventsModel,
    entity: RewardsEventsModel,
    schema: schema
};
