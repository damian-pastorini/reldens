/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');
const { ObjectsModel } = require('./model');

class ObjectsAnimationsModel extends ModelClassDeprecated
{

    static get tableName()
    {
        return 'objects_animations';
    }

    static get relationMappings()
    {
        return {
            parent_object: {
                relation: ModelClassDeprecated.BelongsToOneRelation,
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
