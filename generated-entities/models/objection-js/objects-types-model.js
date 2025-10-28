/**
 *
 * Reldens - ObjectsTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ObjectsTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'objects_types';
    }
    

    static get relationMappings()
    {
        const { ObjectsModel } = require('./objects-model');
        return {
            related_objects: {
                relation: this.HasManyRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsModel.tableName+'.class_type'
                }
            }
        };
    }
}

module.exports.ObjectsTypesModel = ObjectsTypesModel;
