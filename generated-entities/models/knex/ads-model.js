/**
 *
 * Reldens - AdsModel
 *
 */

class AdsModel
{

    static get tableName()
    {
        return 'ads';
    }

    static get relationMappings()
    {
        return {
            related_ads_providers: {
                relation: 'BelongsToOneRelation',
                tableName: 'ads_providers',
                from: 'provider_id',
                to: 'id'
            },
            related_ads_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'ads_types',
                from: 'type_id',
                to: 'id'
            },
            related_ads_banner: {
                relation: 'HasOneRelation',
                tableName: 'ads_banner',
                from: 'id',
                to: 'ads_id'
            },
            related_ads_event_video: {
                relation: 'HasOneRelation',
                tableName: 'ads_event_video',
                from: 'id',
                to: 'ads_id'
            },
            related_ads_played: {
                relation: 'HasManyRelation',
                tableName: 'ads_played',
                from: 'id',
                to: 'ads_id'
            }
        };
    }
}

module.exports.AdsModel = AdsModel;
