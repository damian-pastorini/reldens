/**
 *
 * Reldens - RespawnModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class RespawnModel
{

    constructor(id, object_id, respawn_time, instances_limit, layer, created_at, updated_at)
    {
        this.id = id;
        this.object_id = object_id;
        this.respawn_time = respawn_time;
        this.instances_limit = instances_limit;
        this.layer = layer;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, object_id, respawn_time, instances_limit, layer, created_at, updated_at} = props;
        return new this(id, object_id, respawn_time, instances_limit, layer, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: RespawnModel,
    tableName: 'respawn',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        respawn_time: { type: 'number', nullable: true },
        instances_limit: { type: 'number', nullable: true },
        layer: { type: 'string' },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_objects: {
            kind: 'm:1',
            entity: 'ObjectsModel',
            joinColumn: 'object_id'
        }
    },
});
schema._fkMappings = {
    "object_id": {
        "relationKey": "related_objects",
        "entityName": "ObjectsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    RespawnModel,
    entity: RespawnModel,
    schema: schema
};
