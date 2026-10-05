/**
 *
 * Reldens - AdsEventVideoModel
 *
 */

class AdsEventVideoModel
{

    static get tableName()
    {
        return 'ads_event_video';
    }

    static get relationMappings()
    {
        return {
            related_ads: {
                relation: 'BelongsToOneRelation',
                tableName: 'ads',
                from: 'ads_id',
                to: 'id'
            }
        };
    }
}

module.exports.AdsEventVideoModel = AdsEventVideoModel;
