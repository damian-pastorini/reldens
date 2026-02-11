/**
 *
 * Reldens - ObjectsTypesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ObjectsTypesModel
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
    class: ObjectsTypesModel,
    tableName: 'objects_types',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        related_objects: {
            kind: '1:m',
            entity: 'ObjectsModel',
            mappedBy: 'related_objects_types'
        }
    },
});

module.exports = {
    ObjectsTypesModel,
    entity: ObjectsTypesModel,
    schema: schema
};
