/**
 *
 * Reldens - ObjectsTypesModel
 *
 */

class ObjectsTypesModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static get tableName()
    {
        return 'objects_types';
    }


    static get relationTypes()
    {
        return {
            objects: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects': 'objects'
        };
    }
}

module.exports.ObjectsTypesModel = ObjectsTypesModel;
