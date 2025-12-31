/**
 *
 * Reldens - AdsEventVideoModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsEventVideoModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_event_video';
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

module.exports.AdsEventVideoModel = AdsEventVideoModel;
