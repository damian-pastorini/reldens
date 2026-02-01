/**
 *
 * Reldens - ObjectsStatsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ObjectsStatsModel
{

    constructor(id, object_id, stat_id, base_value, value)
    {
        this.id = id;
        this.object_id = object_id;
        this.stat_id = stat_id;
        this.base_value = base_value;
        this.value = value;
    }

    static createByProps(props)
    {
        const {id, object_id, stat_id, base_value, value} = props;
        return new this(id, object_id, stat_id, base_value, value);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsStatsModel,
    tableName: 'objects_stats',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        stat_id: { type: 'number', persist: false },
        base_value: { type: 'number' },
        value: { type: 'number' },
        related_objects: {
            kind: 'm:1',
            entity: 'ObjectsModel',
            joinColumn: 'object_id'
        },
        related_stats: {
            kind: 'm:1',
            entity: 'StatsModel',
            joinColumn: 'stat_id'
        }
    },
});
schema._fkMappings = {
    "object_id": {
        "relationKey": "related_objects",
        "entityName": "ObjectsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "stat_id": {
        "relationKey": "related_stats",
        "entityName": "StatsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ObjectsStatsModel,
    entity: ObjectsStatsModel,
    schema: schema
};
