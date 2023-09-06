/**
 *
 * Reldens - AdsPlayedModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AdsPlayedModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'ads_played';
    }

    static get relationMappings()
    {
        const { AdsModel } = require('./ads-model');
        const { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        return {
            parent_ads: {
                relation: this.HasOneRelation,
                modelClass: AdsModel,
                join: {
                    from: this.tableName+'.ads_id',
                    to: AdsModel.tableName+'.id'
                }
            },
            parent_player: {
                relation: this.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.AdsPlayedModel = AdsPlayedModel;
