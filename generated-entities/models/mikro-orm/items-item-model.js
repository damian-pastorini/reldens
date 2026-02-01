/**
 *
 * Reldens - ItemsItemModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ItemsItemModel
{

    constructor(id, key, type, group_id, label, description, qty_limit, uses_limit, useTimeOut, execTimeOut, customData, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.type = type;
        this.group_id = group_id;
        this.label = label;
        this.description = description;
        this.qty_limit = qty_limit;
        this.uses_limit = uses_limit;
        this.useTimeOut = useTimeOut;
        this.execTimeOut = execTimeOut;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, key, type, group_id, label, description, qty_limit, uses_limit, useTimeOut, execTimeOut, customData, created_at, updated_at} = props;
        return new this(id, key, type, group_id, label, description, qty_limit, uses_limit, useTimeOut, execTimeOut, customData, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: ItemsItemModel,
    tableName: 'items_item',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        type: { type: 'number', persist: false },
        group_id: { type: 'number', persist: false },
        label: { type: 'string' },
        description: { type: 'string', nullable: true },
        qty_limit: { type: 'number', nullable: true },
        uses_limit: { type: 'number', nullable: true },
        useTimeOut: { type: 'number', nullable: true },
        execTimeOut: { type: 'number', nullable: true },
        customData: { type: 'string', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_items_types: {
            kind: 'm:1',
            entity: 'ItemsTypesModel',
            joinColumn: 'type'
        },
        related_items_group: {
            kind: 'm:1',
            entity: 'ItemsGroupModel',
            joinColumn: 'group_id'
        },
        related_drops_animations: {
            kind: '1:1',
            entity: 'DropsAnimationsModel',
            mappedBy: 'related_items_item'
        },
        related_items_inventory: {
            kind: '1:m',
            entity: 'ItemsInventoryModel',
            mappedBy: 'related_items_item'
        },
        related_items_item_modifiers: {
            kind: '1:m',
            entity: 'ItemsItemModifiersModel',
            mappedBy: 'related_items_item'
        },
        related_objects_items_inventory: {
            kind: '1:m',
            entity: 'ObjectsItemsInventoryModel',
            mappedBy: 'related_items_item'
        },
        related_objects_items_requirements_item_key: {
            kind: '1:m',
            entity: 'ObjectsItemsRequirementsModel',
            mappedBy: 'related_items_item_item_key'
        },
        related_objects_items_requirements_required_item_key: {
            kind: '1:m',
            entity: 'ObjectsItemsRequirementsModel',
            mappedBy: 'related_items_item_item_key'
        },
        related_objects_items_rewards_item_key: {
            kind: '1:m',
            entity: 'ObjectsItemsRewardsModel',
            mappedBy: 'related_items_item_item_key'
        },
        related_objects_items_rewards_reward_item_key: {
            kind: '1:m',
            entity: 'ObjectsItemsRewardsModel',
            mappedBy: 'related_items_item_item_key'
        },
        related_rewards: {
            kind: '1:m',
            entity: 'RewardsModel',
            mappedBy: 'related_items_item'
        }
    },
});
schema._fkMappings = {
    "type": {
        "relationKey": "related_items_types",
        "entityName": "ItemsTypesModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "group_id": {
        "relationKey": "related_items_group",
        "entityName": "ItemsGroupModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    ItemsItemModel,
    entity: ItemsItemModel,
    schema: schema
};
