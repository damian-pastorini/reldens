/**
 *
 * Reldens - ObjectsAssetsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ItemTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'items_types';
    }

}

module.exports.ItemTypesModel = ItemTypesModel;
