/**
 *
 * Reldens - AdsProvidersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsProvidersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_providers';
    }
    
    static get relationMappings()
    {
        const { AdsModel } = require('./ads-model');
        return {
            related_ads: {
                relation: this.HasManyRelation,
                modelClass: AdsModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsModel.tableName+'.provider_id'
                }
            }
        };
    }
}

module.exports.AdsProvidersModel = AdsProvidersModel;
