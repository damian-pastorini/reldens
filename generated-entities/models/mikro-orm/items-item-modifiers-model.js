/**
 *
 * Reldens - ItemsItemModifiersModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ItemsItemModifiersModel
{

    constructor(id, item_id, key, property_key, operation, value, maxProperty)
    {
        this.id = id;
        this.item_id = item_id;
        this.key = key;
        this.property_key = property_key;
        this.operation = operation;
        this.value = value;
        this.maxProperty = maxProperty;
    }

    static createByProps(props)
    {
        const {id, item_id, key, property_key, operation, value, maxProperty} = props;
        return new this(id, item_id, key, property_key, operation, value, maxProperty);
    }
    
}

const schema = new EntitySchema({
    class: ItemsItemModifiersModel,
    tableName: 'items_item_modifiers',
    properties: {
        id: { type: 'number', primary: true },
        item_id: { type: 'number', persist: false },
        key: { type: 'string' },
        property_key: { type: 'string' },
        operation: { type: 'number', persist: false },
        value: { type: 'string' },
        maxProperty: { type: 'string', nullable: true },
        related_items_item: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'item_id'
        },
        related_operation_types: {
            kind: 'm:1',
            entity: 'OperationTypesModel',
            joinColumn: 'operation'
        }
    },
});
schema._fkMappings = {
    "item_id": {
        "relationKey": "related_items_item",
        "entityName": "ItemsItemModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "operation": {
        "relationKey": "related_operation_types",
        "entityName": "OperationTypesModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ItemsItemModifiersModel,
    entity: ItemsItemModifiersModel,
    schema: schema
};
