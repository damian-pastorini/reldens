/**
 *
 * Reldens - ItemsTypesModel
 *
 */

class ItemsTypesModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static get tableName()
    {
        return 'items_types';
    }


    static get relationTypes()
    {
        return {
            items_item: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_items_item': 'items_item'
        };
    }
}

module.exports.ItemsTypesModel = ItemsTypesModel;
