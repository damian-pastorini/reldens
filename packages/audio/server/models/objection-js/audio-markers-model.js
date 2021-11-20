/**
 *
 * Reldens - AudioMarkersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AudioMarkersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'audio_markers';
    }

    static get relationMappings()
    {
        const { AudioModel } = require('./audio-model');
        return {
            parent_audio: {
                relation: this.HasOneRelation,
                modelClass: AudioModel,
                join: {
                    from: this.tableName+'.audio_id',
                    to: AudioModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.AudioMarkersModel = AudioMarkersModel;
