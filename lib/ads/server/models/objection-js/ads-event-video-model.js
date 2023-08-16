/**
 *
 * Reldens - AdsEventVideoModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsEventVideoModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_event_video';
    }

}

module.exports.AdsEventVideoModel = AdsEventVideoModel;
