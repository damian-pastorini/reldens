/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

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

    static get tableName()
    {
        return 'objects_assets';
    }
    

    static get relationTypes()
    {
        return {
            objects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects'
        };
    }
}

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
