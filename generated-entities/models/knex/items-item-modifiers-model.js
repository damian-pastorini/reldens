/**
 *
 * Reldens - ItemsItemModifiersModel
 *
 */

class ItemsItemModifiersModel
{

    static get tableName()
    {
        return 'items_item_modifiers';
    }

    static get relationMappings()
    {
        return {
            related_items_item: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_item',
                from: 'item_id',
                to: 'id'
            },
            related_operation_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'operation_types',
                from: 'operation',
                to: 'id'
            }
        };
    }
}

module.exports.ItemsItemModifiersModel = ItemsItemModifiersModel;
