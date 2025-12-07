/**
 *
 * Reldens - ObjectsItemsRequirementsModel
 *
 */

class ObjectsItemsRequirementsModel
{

    constructor(id, object_id, item_key, required_item_key, required_quantity, auto_remove_requirement)
    {
        this.id = id;
        this.object_id = object_id;
        this.item_key = item_key;
        this.required_item_key = required_item_key;
        this.required_quantity = required_quantity;
        this.auto_remove_requirement = auto_remove_requirement;
    }

    static get tableName()
    {
        return 'objects_items_requirements';
    }
    

    static get relationTypes()
    {
        return {
            items_item_objects_items_requirements_item_keyToitems_item: 'one',
            items_item_objects_items_requirements_required_item_keyToitems_item: 'one',
            objects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects',
            'related_items_item_item_key': 'items_item_objects_items_requirements_item_keyToitems_item',
            'related_items_item_required_item_key': 'items_item_objects_items_requirements_required_item_keyToitems_item'
        };
    }
}

module.exports.ObjectsItemsRequirementsModel = ObjectsItemsRequirementsModel;
