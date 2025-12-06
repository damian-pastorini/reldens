/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsAssetsModel extends ObjectionJsRawModel
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
        const { ObjectsModel } = require('./objects-model');
        return {
            related_objects: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
