/**
 *
 * Reldens - ObjectsItemsInventoryModel
 *
 */

class ObjectsItemsInventoryModel
{

    static get tableName()
    {
        return 'objects_items_inventory';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'owner_id',
                to: 'id'
            },
            related_items_item: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_item',
                from: 'item_id',
                to: 'id'
            }
        };
    }
}

module.exports.ObjectsItemsInventoryModel = ObjectsItemsInventoryModel;
