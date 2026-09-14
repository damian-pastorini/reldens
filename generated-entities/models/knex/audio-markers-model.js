/**
 *
 * Reldens - AudioMarkersModel
 *
 */

class AudioMarkersModel
{

    static get tableName()
    {
        return 'audio_markers';
    }

    static get relationMappings()
    {
        return {
            related_audio: {
                relation: 'BelongsToOneRelation',
                tableName: 'audio',
                from: 'audio_id',
                to: 'id'
            }
        };
    }
}

module.exports.AudioMarkersModel = AudioMarkersModel;
