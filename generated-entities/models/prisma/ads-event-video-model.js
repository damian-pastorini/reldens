/**
 *
 * Reldens - AdsEventVideoModel
 *
 */

class AdsEventVideoModel
{

    constructor(id, ads_id, event_key, event_data)
    {
        this.id = id;
        this.ads_id = ads_id;
        this.event_key = event_key;
        this.event_data = event_data;
    }

    static get tableName()
    {
        return 'ads_event_video';
    }
    

    static get relationTypes()
    {
        return {
            ads: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_ads': 'ads'
        };
    }
}

module.exports.AdsEventVideoModel = AdsEventVideoModel;
