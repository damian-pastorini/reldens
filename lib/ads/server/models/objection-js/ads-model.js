/**
 *
 * Reldens - AdsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads';
    }

    static get relationMappings()
    {
        const { AdsProvidersModel } = require('./ads-providers-model');
        const { AdsTypesModel } = require('./ads-types-model');
        const { AdsBannerModel } = require('./ads-banner-model');
        const { AdsEventVideoModel } = require('./ads-event-video-model');
        return {
            parent_provider: {
                relation: this.HasOneRelation,
                modelClass: AdsProvidersModel,
                join: {
                    from: this.tableName+'.provider_id',
                    to: AdsProvidersModel.tableName+'.id'
                }
            },
            parent_type: {
                relation: this.HasOneRelation,
                modelClass: AdsTypesModel,
                join: {
                    from: this.tableName+'.type_id',
                    to: AdsTypesModel.tableName+'.id'
                }
            },
            parent_event_video: {
                relation: this.HasOneRelation,
                modelClass: AdsEventVideoModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsEventVideoModel.tableName+'.ads_id'
                }
            },
            parent_banner: {
                relation: this.HasOneRelation,
                modelClass: AdsBannerModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsBannerModel.tableName+'.ads_id'
                }
            }
        }
    }

}

module.exports.AdsModel = AdsModel;
