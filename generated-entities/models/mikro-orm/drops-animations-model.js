/**
 *
 * Reldens - DropsAnimationsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class DropsAnimationsModel
{

    constructor(id, item_id, asset_type, asset_key, file, extra_params)
    {
        this.id = id;
        this.item_id = item_id;
        this.asset_type = asset_type;
        this.asset_key = asset_key;
        this.file = file;
        this.extra_params = extra_params;
    }

    static createByProps(props)
    {
        const {id, item_id, asset_type, asset_key, file, extra_params} = props;
        return new this(id, item_id, asset_type, asset_key, file, extra_params);
    }
    
}

const schema = new EntitySchema({
    class: DropsAnimationsModel,
    tableName: 'drops_animations',
    properties: {
        id: { type: 'number', primary: true },
        item_id: { type: 'number', persist: false },
        asset_type: { type: 'string', nullable: true },
        asset_key: { type: 'string' },
        file: { type: 'string' },
        extra_params: { type: 'string', nullable: true },
        related_items_item: {
            kind: 'm:1',
            entity: 'ItemsItemModel',
            joinColumn: 'item_id'
        }
    },
});
schema._fkMappings = {
    "item_id": {
        "relationKey": "related_items_item",
        "entityName": "ItemsItemModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    DropsAnimationsModel,
    entity: DropsAnimationsModel,
    schema: schema
};
