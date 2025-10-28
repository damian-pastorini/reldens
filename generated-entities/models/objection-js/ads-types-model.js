/**
 *
 * Reldens - AdsTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_types';
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
                    to: AdsModel.tableName+'.type_id'
                }
            }
        };
    }
}

module.exports.AdsTypesModel = AdsTypesModel;
