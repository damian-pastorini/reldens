/**
 *
 * Reldens - ObjectsItemsRequirementsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, object_id, item_key, required_item_key, required_quantity, auto_remove_requirement} = props;
        return new this(id, object_id, item_key, required_item_key, required_quantity, auto_remove_requirement);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsItemsRequirementsModel,
    tableName: 'objects_items_requirements',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        item_key: { type: 'string', persist: false },
        required_item_key: { type: 'string', persist: false },
        required_quantity: { type: 'number', nullable: true },
        auto_remove_requirement: { type: 'number', nullable: true },
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
        related_items_item_required_item_key: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'required_item_key'
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
    "required_item_key": {
        "relationKey": "related_items_item_required_item_key",
        "entityName": "ItemsItemModel",
        "referencedColumn": "key",
        "nullable": false
    }
};
module.exports = {
    ObjectsItemsRequirementsModel,
    entity: ObjectsItemsRequirementsModel,
    schema: schema
};
