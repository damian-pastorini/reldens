/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ObjectsAnimationsModel
{

    constructor(id, object_id, animationKey, animationData)
    {
        this.id = id;
        this.object_id = object_id;
        this.animationKey = animationKey;
        this.animationData = animationData;
    }

    static createByProps(props)
    {
        const {id, object_id, animationKey, animationData} = props;
        return new this(id, object_id, animationKey, animationData);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsAnimationsModel,
    tableName: 'objects_animations',
    properties: {
        id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        animationKey: { type: 'string' },
        animationData: { type: 'string' },
        related_objects: {
            kind: 'm:1',
            entity: 'ObjectsModel',
            joinColumn: 'object_id'
        }
    },
});
schema._fkMappings = {
    "object_id": {
        "relationKey": "related_objects",
        "entityName": "ObjectsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ObjectsAnimationsModel,
    entity: ObjectsAnimationsModel,
    schema: schema
};
