/**
 *
 * Reldens - RespawnModel
 *
 */

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

    static get tableName()
    {
        return 'respawn';
    }
    

    static get relationTypes()
    {
        return {
            objects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects'
        };
    }
}

module.exports.RespawnModel = RespawnModel;
