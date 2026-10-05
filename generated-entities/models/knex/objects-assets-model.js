/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

class ObjectsAssetsModel
{

    static get tableName()
    {
        return 'objects_assets';
    }

    static get idColumn()
    {
        return 'object_asset_id';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'BelongsToOneRelation',
                tableName: 'objects',
                from: 'object_id',
                to: 'id'
            }
        };
    }
}

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
