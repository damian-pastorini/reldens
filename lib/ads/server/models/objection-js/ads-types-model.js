/**
 *
 * Reldens - AdsTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_types';
    }

}

module.exports.AdsTypesModel = AdsTypesModel;
