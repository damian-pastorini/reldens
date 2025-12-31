/**
 *
 * Reldens - AdsProvidersModel
 *
 */

class AdsProvidersModel
{

    constructor(id, key, enabled)
    {
        this.id = id;
        this.key = key;
        this.enabled = enabled;
    }

    static get tableName()
    {
        return 'ads_providers';
    }
    

    static get relationTypes()
    {
        return {
            ads: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_ads': 'ads'
        };
    }
}

module.exports.AdsProvidersModel = AdsProvidersModel;
