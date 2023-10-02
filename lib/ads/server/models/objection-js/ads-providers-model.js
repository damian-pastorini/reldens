/**
 *
 * Reldens - AdsProvidersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsProvidersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_providers';
    }

}

module.exports.AdsProvidersModel = AdsProvidersModel;
