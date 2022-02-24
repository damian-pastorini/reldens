/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { ObjectsModel } = require('./objects-model');

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
        return {
            parent_object: {
                relation: this.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.object_id',
                    to: ObjectsModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
