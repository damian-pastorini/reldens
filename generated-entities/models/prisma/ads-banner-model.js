/**
 *
 * Reldens - AdsBannerModel
 *
 */

class AdsBannerModel
{

    constructor(id, ads_id, banner_data)
    {
        this.id = id;
        this.ads_id = ads_id;
        this.banner_data = banner_data;
    }

    static get tableName()
    {
        return 'ads_banner';
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

module.exports.AdsBannerModel = AdsBannerModel;
