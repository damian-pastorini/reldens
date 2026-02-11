/**
 *
 * Reldens - RewardsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class RewardsModel
{

    constructor(id, object_id, item_id, modifier_id, experience, drop_rate, drop_quantity, is_unique, was_given, has_drop_body, created_at, updated_at)
    {
        this.id = id;
        this.object_id = object_id;
        this.item_id = item_id;
        this.modifier_id = modifier_id;
        this.experience = experience;
        this.drop_rate = drop_rate;
        this.drop_quantity = drop_quantity;
        this.is_unique = is_unique;
        this.was_given = was_given;
        this.has_drop_body = has_drop_body;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, object_id, item_id, modifier_id, experience, drop_rate, drop_quantity, is_unique, was_given, has_drop_body, created_at, updated_at} = props;
        return new this(id, object_id, item_id, modifier_id, experience, drop_rate, drop_quantity, is_unique, was_given, has_drop_body, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: RewardsModel,
    tableName: 'rewards',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        item_id: { type: 'number', persist: false },
        modifier_id: { type: 'number', persist: false },
        experience: { type: 'number', nullable: true },
        drop_rate: { type: 'number' },
        drop_quantity: { type: 'number' },
        is_unique: { type: 'number', nullable: true },
        was_given: { type: 'number', nullable: true },
        has_drop_body: { type: 'number', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_objects: {
            kind: 'm:1',
            entity: 'ObjectsModel',
            joinColumn: 'object_id'
        },
        related_items_item: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'item_id'
        },
        related_rewards_modifiers: {
            kind: 'm:1',
            entity: 'RewardsModifiersModel',
            joinColumn: 'modifier_id'
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
    "item_id": {
        "relationKey": "related_items_item",
        "entityName": "ItemsItemModel",
        "referencedColumn": "id",
        "nullable": true
    },
    "modifier_id": {
        "relationKey": "related_rewards_modifiers",
        "entityName": "RewardsModifiersModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    RewardsModel,
    entity: RewardsModel,
    schema: schema
};
