/**
 *
 * Reldens - AdsTypesModel
 *
 */

class AdsTypesModel
{

    static get tableName()
    {
        return 'ads_types';
    }

    static get relationMappings()
    {
        return {
            related_ads: {
                relation: 'HasManyRelation',
                tableName: 'ads',
                from: 'id',
                to: 'type_id'
            }
        };
    }
}

module.exports.AdsTypesModel = AdsTypesModel;
