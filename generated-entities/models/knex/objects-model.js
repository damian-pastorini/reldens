/**
 *
 * Reldens - ObjectsModel
 *
 */

class ObjectsModel
{

    static get tableName()
    {
        return 'objects';
    }

    static get relationMappings()
    {
        return {
            related_rooms: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'room_id',
                to: 'id'
            },
            related_objects_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects_types',
                from: 'class_type',
                to: 'id'
            },
            related_objects_animations: {
                relation: 'HasManyRelation',
                tableName: 'objects_animations',
                from: 'id',
                to: 'object_id'
            },
            related_objects_assets: {
                relation: 'HasManyRelation',
                tableName: 'objects_assets',
                from: 'id',
                to: 'object_id'
            },
            related_objects_items_inventory: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_inventory',
                from: 'id',
                to: 'owner_id'
            },
            related_objects_items_requirements: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_requirements',
                from: 'id',
                to: 'object_id'
            },
            related_objects_items_rewards: {
                relation: 'HasManyRelation',
                tableName: 'objects_items_rewards',
                from: 'id',
                to: 'object_id'
            },
            related_objects_skills: {
                relation: 'HasManyRelation',
                tableName: 'objects_skills',
                from: 'id',
                to: 'object_id'
            },
            related_objects_stats: {
                relation: 'HasManyRelation',
                tableName: 'objects_stats',
                from: 'id',
                to: 'object_id'
            },
            related_respawn: {
                relation: 'HasManyRelation',
                tableName: 'respawn',
                from: 'id',
                to: 'object_id'
            },
            related_rewards: {
                relation: 'HasManyRelation',
                tableName: 'rewards',
                from: 'id',
                to: 'object_id'
            }
        };
    }
}

module.exports.ObjectsModel = ObjectsModel;
