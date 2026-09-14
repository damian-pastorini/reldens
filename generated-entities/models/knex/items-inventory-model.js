/**
 *
 * Reldens - ItemsInventoryModel
 *
 */

class ItemsInventoryModel
{

    static get tableName()
    {
        return 'items_inventory';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
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

module.exports.ItemsInventoryModel = ItemsInventoryModel;
