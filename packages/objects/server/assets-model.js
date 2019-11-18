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
        // @TODO: - Seiyria - if you're worrying about circular references, you may need to restructure your code
        //   instead. all imports should be handled at the top of the file, before any logic resolves. this makes your
        //   code more testable. ideally, you would also use a DI framework to make your code easier to follow.
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

module.exports.ObjectsAssetsModel = ObjectsAssetsModel;
