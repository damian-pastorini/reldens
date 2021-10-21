/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

const { ModelClass } = require('@reldens/storage');
const { ObjectsModel } = require('./model');

class ObjectsAssetsModel extends ModelClass
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
                relation: ModelClass.BelongsToOneRelation,
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
