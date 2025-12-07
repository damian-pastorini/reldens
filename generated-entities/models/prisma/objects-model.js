/**
 *
 * Reldens - ObjectsModel
 *
 */

class ObjectsModel
{

    constructor(id, room_id, layer_name, tile_index, class_type, object_class_key, client_key, title, private_params, client_params, enabled, created_at, updated_at)
    {
        this.id = id;
        this.room_id = room_id;
        this.layer_name = layer_name;
        this.tile_index = tile_index;
        this.class_type = class_type;
        this.object_class_key = object_class_key;
        this.client_key = client_key;
        this.title = title;
        this.private_params = private_params;
        this.client_params = client_params;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'objects';
    }
    

    static get relationTypes()
    {
        return {
            objects_types: 'one',
            rooms: 'one',
            objects_animations: 'many',
            objects_assets: 'many',
            objects_items_inventory: 'many',
            objects_items_requirements: 'many',
            objects_items_rewards: 'many',
            objects_skills: 'many',
            objects_stats: 'many',
            respawn: 'many',
            rewards: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_rooms': 'rooms',
            'related_objects_types': 'objects_types',
            'related_objects_animations': 'objects_animations',
            'related_objects_assets': 'objects_assets',
            'related_objects_items_inventory': 'objects_items_inventory',
            'related_objects_items_requirements': 'objects_items_requirements',
            'related_objects_items_rewards': 'objects_items_rewards',
            'related_objects_skills': 'objects_skills',
            'related_objects_stats': 'objects_stats',
            'related_respawn': 'respawn',
            'related_rewards': 'rewards'
        };
    }
}

module.exports.ObjectsModel = ObjectsModel;
