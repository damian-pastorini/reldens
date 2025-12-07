/**
 *
 * Reldens - AdsTypesModel
 *
 */

class AdsTypesModel
{

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
    }

    static get tableName()
    {
        return 'ads_types';
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

module.exports.AdsTypesModel = AdsTypesModel;
