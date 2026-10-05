/**
 *
 * Reldens - AdsBannerModel
 *
 */

class AdsBannerModel
{

    static get tableName()
    {
        return 'ads_banner';
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

module.exports.AdsBannerModel = AdsBannerModel;
