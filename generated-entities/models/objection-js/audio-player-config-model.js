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
        const { PlayersModel } = require('./players-model');
        const { AudioCategoriesModel } = require('./audio-categories-model');
        return {
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            },
            related_audio_categories: {
                relation: this.BelongsToOneRelation,
                modelClass: AudioCategoriesModel,
                join: {
                    from: this.tableName+'.category_id',
                    to: AudioCategoriesModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.AudioPlayerConfigModel = AudioPlayerConfigModel;
