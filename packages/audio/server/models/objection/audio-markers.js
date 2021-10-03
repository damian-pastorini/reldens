/**
 *
 * Reldens - AudioMarkersModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class AudioMarkersModel extends ModelClass
{

    static get tableName()
    {
        return 'audio_markers';
    }

    static get relationMappings()
    {
        const { AudioModel } = require('./audio');
        return {
            parent_audio: {
                relation: ModelClass.HasOneRelation,
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
