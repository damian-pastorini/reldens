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

}

module.exports.ObjectsTypesModel = ObjectsTypesModel;
