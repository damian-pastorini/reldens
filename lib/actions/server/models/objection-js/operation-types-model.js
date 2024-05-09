/**
 *
 * Reldens - OperationTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class OperationTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'operation_types';
    }

}

module.exports.OperationTypesModel = OperationTypesModel;
