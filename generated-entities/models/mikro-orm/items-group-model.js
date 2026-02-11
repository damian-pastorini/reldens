/**
 *
 * Reldens - ItemsGroupModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

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

    static createByProps(props)
    {
        const {id, key, label, description, files_name, sort, items_limit, limit_per_item} = props;
        return new this(id, key, label, description, files_name, sort, items_limit, limit_per_item);
    }
    
}

const schema = new EntitySchema({
    class: ItemsGroupModel,
    tableName: 'items_group',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        label: { type: 'string' },
        description: { type: 'string', nullable: true },
        files_name: { type: 'string', nullable: true },
        sort: { type: 'number', nullable: true },
        items_limit: { type: 'number', nullable: true },
        limit_per_item: { type: 'number', nullable: true },
        related_items_item: {
            kind: '1:m',
            entity: 'ItemsItemModel',
            mappedBy: 'related_items_group'
        }
    },
});

module.exports = {
    ItemsGroupModel,
    entity: ItemsGroupModel,
    schema: schema
};
