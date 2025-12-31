/**
 *
 * Reldens - ItemsInventoryModel
 *
 */

class ItemsInventoryModel
{

    constructor(id, owner_id, item_id, qty, remaining_uses, is_active)
    {
        this.id = id;
        this.owner_id = owner_id;
        this.item_id = item_id;
        this.qty = qty;
        this.remaining_uses = remaining_uses;
        this.is_active = is_active;
    }

    static get tableName()
    {
        return 'items_inventory';
    }
    

    static get relationTypes()
    {
        return {
            items_item: 'one',
            players: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players',
            'related_items_item': 'items_item'
        };
    }
}

module.exports.ItemsInventoryModel = ItemsInventoryModel;
