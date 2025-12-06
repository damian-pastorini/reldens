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
        const { PlayersModel } = require('./players-model');
        return {
            related_ads: {
                relation: this.BelongsToOneRelation,
                modelClass: AdsModel,
                join: {
                    from: this.tableName+'.ads_id',
                    to: AdsModel.tableName+'.id'
                }
            },
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.AdsPlayedModel = AdsPlayedModel;
