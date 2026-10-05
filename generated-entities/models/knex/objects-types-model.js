/**
 *
 * Reldens - ObjectsTypesModel
 *
 */

class ObjectsTypesModel
{

    static get tableName()
    {
        return 'objects_types';
    }

    static get relationMappings()
    {
        return {
            related_objects: {
                relation: 'HasManyRelation',
                tableName: 'objects',
                from: 'id',
                to: 'class_type'
            }
        };
    }
}

module.exports.ObjectsTypesModel = ObjectsTypesModel;
