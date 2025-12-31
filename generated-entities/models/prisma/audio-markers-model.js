/**
 *
 * Reldens - AudioMarkersModel
 *
 */

class AudioMarkersModel
{

    constructor(id, audio_id, marker_key, start, duration, config)
    {
        this.id = id;
        this.audio_id = audio_id;
        this.marker_key = marker_key;
        this.start = start;
        this.duration = duration;
        this.config = config;
    }

    static get tableName()
    {
        return 'audio_markers';
    }
    

    static get relationTypes()
    {
        return {
            audio: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_audio': 'audio'
        };
    }
}

module.exports.AudioMarkersModel = AudioMarkersModel;
