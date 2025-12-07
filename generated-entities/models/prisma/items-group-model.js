/**
 *
 * Reldens - ItemsGroupModel
 *
 */

class ItemsGroupModel
{

    constructor(id, key, label, description, files_name, sort, items_limit, limit_per_item)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.description = description;
        this.files_name = files_name;
        this.sort = sort;
        this.items_limit = items_limit;
        this.limit_per_item = limit_per_item;
    }

    static get tableName()
    {
        return 'items_group';
    }
    

    static get relationTypes()
    {
        return {
            items_item: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_items_item': 'items_item'
        };
    }
}

module.exports.ItemsGroupModel = ItemsGroupModel;
