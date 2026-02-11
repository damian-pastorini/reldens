/**
 *
 * Reldens - ItemsInventoryModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, owner_id, item_id, qty, remaining_uses, is_active} = props;
        return new this(id, owner_id, item_id, qty, remaining_uses, is_active);
    }
    
}

const schema = new EntitySchema({
    class: ItemsInventoryModel,
    tableName: 'items_inventory',
    properties: {
        id: { type: 'number', primary: true },
        owner_id: { type: 'number', persist: false },
        item_id: { type: 'number', persist: false },
        qty: { type: 'number', nullable: true },
        remaining_uses: { type: 'number', nullable: true },
        is_active: { type: 'number', nullable: true },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'owner_id'
        },
        related_items_item: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'item_id'
        }
    },
});
schema._fkMappings = {
    "owner_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "item_id": {
        "relationKey": "related_items_item",
        "entityName": "ItemsItemModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ItemsInventoryModel,
    entity: ItemsInventoryModel,
    schema: schema
};
