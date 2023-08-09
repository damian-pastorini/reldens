/**
 *
 * Reldens - AdsItemsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsItemsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_items';
    }

}

module.exports.AdsItemsModel = AdsItemsModel;
