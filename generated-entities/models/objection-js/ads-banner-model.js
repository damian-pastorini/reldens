/**
 *
 * Reldens - AdsBannerModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsBannerModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_banner';
    }

    static get relationMappings()
    {
        const { AdsModel } = require('./ads-model');
        return {
            related_ads: {
                relation: this.BelongsToOneRelation,
                modelClass: AdsModel,
                join: {
                    from: this.tableName+'.ads_id',
                    to: AdsModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.AdsBannerModel = AdsBannerModel;
