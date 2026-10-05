/**
 *
 * Reldens - ItemsGroupModel
 *
 */

class ItemsGroupModel
{

    static get tableName()
    {
        return 'items_group';
    }

    static get relationMappings()
    {
        return {
            related_items_item: {
                relation: 'HasManyRelation',
                tableName: 'items_item',
                from: 'id',
                to: 'group_id'
            }
        };
    }
}

module.exports.ItemsGroupModel = ItemsGroupModel;
