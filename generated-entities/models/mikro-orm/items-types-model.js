/**
 *
 * Reldens - ItemsTypesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ItemsTypesModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static createByProps(props)
    {
        const {id, key} = props;
        return new this(id, key);
    }
    
}

const schema = new EntitySchema({
    class: ItemsTypesModel,
    tableName: 'items_types',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        related_items_item: {
            kind: '1:m',
            entity: 'ItemsItemModel',
            mappedBy: 'related_items_types'
        }
    },
});

module.exports = {
    ItemsTypesModel,
    entity: ItemsTypesModel,
    schema: schema
};
