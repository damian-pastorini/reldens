/**
 *
 * Reldens - AudioPlayerConfigModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AudioPlayerConfigModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'audio_player_config';
    }

    static get relationMappings()
    {
        const { AudioCategoriesModel } = require('./audio-categories-model');
        const { PlayersModel } = require('../../../../users/server/models/objection-js/players-model');
        return {
            player_owner: {
                relation: this.HasOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            category: {
                relation: this.HasOneRelation,
                modelClass: AudioCategoriesModel,
                join: {
                    from: this.tableName+'.category_id',
                    to: AudioCategoriesModel.tableName+'.id'
                }
            }
        }
    }

    static loadByPlayerId(playerId)
    {
        return this.query().where('player_id', playerId);
    }

    static loadPlayerConfig(playerId, categoryId)
    {
        return this.query()
            .where('player_id', playerId)
            .where('category_id', categoryId)
            .first();
    }

    static insertConfig(configData)
    {
        return this.query().insertGraphAndFetch(configData);
    }

    static saveConfigByPlayerAndCategory(playerId, categoryId, enabled)
    {
        return this.query()
            .patch({enabled: enabled})
            .where('player_id', playerId)
            .where('category_id', categoryId);
    }

}

module.exports.AudioPlayerConfigModel = AudioPlayerConfigModel;