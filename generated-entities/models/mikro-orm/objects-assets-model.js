/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ObjectsAssetsModel
{

    constructor(object_asset_id, object_id, asset_type, asset_key, asset_file, extra_params)
    {
        this.object_asset_id = object_asset_id;
        this.object_id = object_id;
        this.asset_type = asset_type;
        this.asset_key = asset_key;
        this.asset_file = asset_file;
        this.extra_params = extra_params;
    }

    static createByProps(props)
    {
        const {object_asset_id, object_id, asset_type, asset_key, asset_file, extra_params} = props;
        return new this(object_asset_id, object_id, asset_type, asset_key, asset_file, extra_params);
    }
    
}

const schema = new EntitySchema({
    class: ObjectsAssetsModel,
    tableName: 'objects_assets',
    properties: {
        object_asset_id: { type: 'number', primary: true },
        object_id: { type: 'number', persist: false },
        asset_type: { type: 'string' },
        asset_key: { type: 'string' },
        asset_file: { type: 'string' },
        extra_params: { type: 'string', nullable: true },
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
    ObjectsAssetsModel,
    entity: ObjectsAssetsModel,
    schema: schema
};
