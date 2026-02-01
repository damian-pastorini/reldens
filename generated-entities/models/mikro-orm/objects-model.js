/**
 *
 * Reldens - ObjectsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, room_id, layer_name, tile_index, class_type, object_class_key, client_key, title, private_params, client_params, enabled, created_at, updated_at} = props;
        return new this(id, room_id, layer_name, tile_index, class_type, object_class_key, client_key, title, private_params, client_params, enabled, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsModel,
    tableName: 'objects',
    properties: {
        id: { type: 'number', primary: true },
        room_id: { type: 'number', persist: false },
        layer_name: { type: 'string' },
        tile_index: { type: 'number', nullable: true },
        class_type: { type: 'number', persist: false },
        object_class_key: { type: 'string' },
        client_key: { type: 'string' },
        title: { type: 'string', nullable: true },
        private_params: { type: 'string', nullable: true },
        client_params: { type: 'string', nullable: true },
        enabled: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_rooms: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'room_id'
        },
        related_objects_types: {
            kind: 'm:1',
            entity: 'ObjectsTypesModel',
            joinColumn: 'class_type'
        },
        related_objects_animations: {
            kind: '1:m',
            entity: 'ObjectsAnimationsModel',
            mappedBy: 'related_objects'
        },
        related_objects_assets: {
            kind: '1:m',
            entity: 'ObjectsAssetsModel',
            mappedBy: 'related_objects'
        },
        related_objects_items_inventory: {
            kind: '1:m',
            entity: 'ObjectsItemsInventoryModel',
            mappedBy: 'related_objects'
        },
        related_objects_items_requirements: {
            kind: '1:m',
            entity: 'ObjectsItemsRequirementsModel',
            mappedBy: 'related_objects'
        },
        related_objects_items_rewards: {
            kind: '1:m',
            entity: 'ObjectsItemsRewardsModel',
            mappedBy: 'related_objects'
        },
        related_objects_skills: {
            kind: '1:m',
            entity: 'ObjectsSkillsModel',
            mappedBy: 'related_objects'
        },
        related_objects_stats: {
            kind: '1:m',
            entity: 'ObjectsStatsModel',
            mappedBy: 'related_objects'
        },
        related_respawn: {
            kind: '1:m',
            entity: 'RespawnModel',
            mappedBy: 'related_objects'
        },
        related_rewards: {
            kind: '1:m',
            entity: 'RewardsModel',
            mappedBy: 'related_objects'
        }
    },
});
schema._fkMappings = {
    "room_id": {
        "relationKey": "related_rooms",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "class_type": {
        "relationKey": "related_objects_types",
        "entityName": "ObjectsTypesModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    ObjectsModel,
    entity: ObjectsModel,
    schema: schema
};
