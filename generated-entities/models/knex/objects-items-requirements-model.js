/**
 *
 * Reldens - ObjectsItemsRequirementsModel
 *
 */

class ObjectsItemsRequirementsModel
{

    static get tableName()
    {
        return 'objects_items_requirements';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'object_id',
                to: 'id'
            },
            related_items_item_item_key: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_item',
                from: 'item_key',
                to: 'key'
            },
            related_items_item_required_item_key: {
                relation: 'BelongsToOneRelation',
                tableName: 'items_item',
                from: 'required_item_key',
                to: 'key'
            }
        };
    }
}

module.exports.ObjectsItemsRequirementsModel = ObjectsItemsRequirementsModel;
