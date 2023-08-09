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
        return {
            parent_room: {
                relation: this.HasOneRelation,
                modelClass: AdsProvidersModel,
                join: {
                    from: this.tableName+'.provider_id',
                    to: AdsProvidersModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.AdsModel = AdsModel;
