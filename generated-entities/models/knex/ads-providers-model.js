/**
 *
 * Reldens - AdsProvidersModel
 *
 */

class AdsProvidersModel
{

    static get tableName()
    {
        return 'ads_providers';
    }

    static get relationMappings()
    {
        return {
            related_ads: {
                relation: 'HasManyRelation',
                tableName: 'ads',
                from: 'id',
                to: 'provider_id'
            }
        };
    }
}

module.exports.AdsProvidersModel = AdsProvidersModel;
