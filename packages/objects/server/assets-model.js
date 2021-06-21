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

    static get relationMappings()
    {
        return {
            parent_object: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: 'objects_assets.object_id',
                    to: 'objects.id'
                }
            }
        }
    }

}

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
