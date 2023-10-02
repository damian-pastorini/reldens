/**
 *
 * Reldens - AdsBannerModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsBannerModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_banner';
    }

}

module.exports.AdsBannerModel = AdsBannerModel;
