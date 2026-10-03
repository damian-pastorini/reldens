/**
 *
 * Reldens - ItemsTypesModel
 *
 */

class ItemsTypesModel
{

    static get tableName()
    {
        return 'items_types';
    }

    static get relationMappings()
    {
        return {
            related_items_item: {
                relation: 'HasManyRelation',
                tableName: 'items_item',
                from: 'id',
                to: 'type'
            }
        };
    }
}

module.exports.ItemsTypesModel = ItemsTypesModel;
