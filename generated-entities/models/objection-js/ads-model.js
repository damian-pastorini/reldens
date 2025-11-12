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
        const { AdsPlayedModel } = require('./ads-played-model');
        return {
            related_ads_providers: {
                relation: this.BelongsToOneRelation,
                modelClass: AdsProvidersModel,
                join: {
                    from: this.tableName+'.provider_id',
                    to: AdsProvidersModel.tableName+'.id'
                }
            },
            related_ads_types: {
                relation: this.BelongsToOneRelation,
                modelClass: AdsTypesModel,
                join: {
                    from: this.tableName+'.type_id',
                    to: AdsTypesModel.tableName+'.id'
                }
            },
            related_ads_banner: {
                relation: this.HasOneRelation,
                modelClass: AdsBannerModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsBannerModel.tableName+'.ads_id'
                }
            },
            related_ads_event_video: {
                relation: this.HasOneRelation,
                modelClass: AdsEventVideoModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsEventVideoModel.tableName+'.ads_id'
                }
            },
            related_ads_played: {
                relation: this.HasManyRelation,
                modelClass: AdsPlayedModel,
                join: {
                    from: this.tableName+'.id',
                    to: AdsPlayedModel.tableName+'.ads_id'
                }
            }
        };
    }
}

module.exports.AdsModel = AdsModel;
