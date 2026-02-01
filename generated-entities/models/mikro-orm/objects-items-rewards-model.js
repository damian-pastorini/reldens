/**
 *
 * Reldens - ObjectsItemsRewardsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ObjectsItemsRewardsModel
{

    constructor(id, object_id, item_key, reward_item_key, reward_quantity, reward_item_is_required)
    {
        this.id = id;
        this.object_id = object_id;
        this.item_key = item_key;
        this.reward_item_key = reward_item_key;
        this.reward_quantity = reward_quantity;
        this.reward_item_is_required = reward_item_is_required;
    }

    static createByProps(props)
    {
        const {id, object_id, item_key, reward_item_key, reward_quantity, reward_item_is_required} = props;
        return new this(id, object_id, item_key, reward_item_key, reward_quantity, reward_item_is_required);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsItemsRewardsModel,
    tableName: 'objects_items_rewards',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        item_key: { type: 'string', persist: false },
        reward_item_key: { type: 'string', persist: false },
        reward_quantity: { type: 'number', nullable: true },
        reward_item_is_required: { type: 'number', nullable: true },
        related_objects: {
            kind: 'm:1',
            entity: 'ObjectsModel',
            joinColumn: 'object_id'
        },
        related_items_item_item_key: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'item_key'
        },
        related_items_item_reward_item_key: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'reward_item_key'
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
    "item_key": {
        "relationKey": "related_items_item_item_key",
        "entityName": "ItemsItemModel",
        "referencedColumn": "key",
        "nullable": false
    },
    "reward_item_key": {
        "relationKey": "related_items_item_reward_item_key",
        "entityName": "ItemsItemModel",
        "referencedColumn": "key",
        "nullable": false
    }
};
module.exports = {
    ObjectsItemsRewardsModel,
    entity: ObjectsItemsRewardsModel,
    schema: schema
};
