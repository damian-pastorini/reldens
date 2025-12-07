/**
 *
 * Reldens - ItemsItemModifiersModel
 *
 */

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

    static get tableName()
    {
        return 'items_item_modifiers';
    }
    

    static get relationTypes()
    {
        return {
            items_item: 'one',
            operation_types: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_items_item': 'items_item',
            'related_operation_types': 'operation_types'
        };
    }
}

module.exports.ItemsItemModifiersModel = ItemsItemModifiersModel;
