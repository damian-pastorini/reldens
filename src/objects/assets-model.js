/**
 *
 * Reldens - ObjectsModel
 *
 * Objects model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class ObjectsAssetsModel extends Model
{

    static get tableName()
    {
        return 'objects_assets';
    }

    static get relationMappings()
    {
        // to avoid require loop:
        const Objects = require('./model');
        return {
            parent_object: {
                relation: Model.BelongsToOneRelation,
                modelClass: Objects,
                join: {
                    from: 'objects_assets.object_id',
                    to: 'objects.id'
                }
            }
        }
    }

}

module.exports = ObjectsAssetsModel;
