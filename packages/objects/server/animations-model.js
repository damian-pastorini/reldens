/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

const { ModelClass } = require('@reldens/storage');
const { ObjectsModel } = require('./model');

class ObjectsAnimationsModel extends ModelClass
{

    static get tableName()
    {
        return 'objects_animations';
    }

    static get relationMappings()
    {
        return {
            parent_object: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: ObjectsModel,
                join: {
                    from: 'objects_animations.object_id',
                    to: 'objects.id'
                }
            }
        }
    }

}

module.exports.ObjectsAnimationsModel = ObjectsAnimationsModel;
