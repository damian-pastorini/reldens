/**
 *
 * Reldens - AdsModel
 *
 */

class AdsModel
{

    constructor(id, key, provider_id, type_id, width, height, position, top, bottom, left, right, replay, enabled, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.provider_id = provider_id;
        this.type_id = type_id;
        this.width = width;
        this.height = height;
        this.position = position;
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
        this.replay = replay;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'ads';
    }
    

    static get relationTypes()
    {
        return {
            ads_providers: 'one',
            ads_types: 'one',
            ads_banner: 'one',
            ads_event_video: 'one',
            ads_played: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_ads_providers': 'ads_providers',
            'related_ads_types': 'ads_types',
            'related_ads_banner': 'ads_banner',
            'related_ads_event_video': 'ads_event_video',
            'related_ads_played': 'ads_played'
        };
    }
}

module.exports.AdsModel = AdsModel;
