/**
 *
 * Reldens - ObjectsAnimationsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsAnimationsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_animations';
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

module.exports.ObjectsAnimationsModel = ObjectsAnimationsModel;
