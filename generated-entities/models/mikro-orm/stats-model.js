/**
 *
 * Reldens - StatsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class StatsModel
{

    constructor(id, key, label, description, base_value, customData, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.description = description;
        this.base_value = base_value;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, key, label, description, base_value, customData, created_at, updated_at} = props;
        return new this(id, key, label, description, base_value, customData, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: StatsModel,
    tableName: 'stats',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        label: { type: 'string' },
        description: { type: 'string' },
        base_value: { type: 'number' },
        customData: { type: 'string', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_objects_stats: {
            kind: '1:m',
            entity: 'ObjectsStatsModel',
            mappedBy: 'related_stats'
        },
        related_players_stats: {
            kind: '1:m',
            entity: 'PlayersStatsModel',
            mappedBy: 'related_stats'
        }
    },
});

module.exports = {
    StatsModel,
    entity: StatsModel,
    schema: schema
};
