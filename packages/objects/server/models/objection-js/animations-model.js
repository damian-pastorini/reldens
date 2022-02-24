/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { ObjectsModel } = require('./objects-model');

class ObjectsAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_animations';
    }

    static get relationMappings()
    {
        return {
            parent_object: {
                relation: this.BelongsToOneRelation,
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
