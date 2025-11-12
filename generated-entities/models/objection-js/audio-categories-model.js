/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AudioCategoriesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'audio_categories';
    }
    
    static get relationMappings()
    {
        const { AudioModel } = require('./audio-model');
        const { AudioPlayerConfigModel } = require('./audio-player-config-model');
        return {
            related_audio: {
                relation: this.HasManyRelation,
                modelClass: AudioModel,
                join: {
                    from: this.tableName+'.id',
                    to: AudioModel.tableName+'.category_id'
                }
            },
            related_audio_player_config: {
                relation: this.HasManyRelation,
                modelClass: AudioPlayerConfigModel,
                join: {
                    from: this.tableName+'.id',
                    to: AudioPlayerConfigModel.tableName+'.category_id'
                }
            }
        };
    }
}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
