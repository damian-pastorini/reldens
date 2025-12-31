/**
 *
 * Reldens - AudioModel
 *
 */

class AudioModel
{

    constructor(id, audio_key, files_name, config, room_id, category_id, enabled, created_at, updated_at)
    {
        this.id = id;
        this.audio_key = audio_key;
        this.files_name = files_name;
        this.config = config;
        this.room_id = room_id;
        this.category_id = category_id;
        this.enabled = enabled;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'audio';
    }
    

    static get relationTypes()
    {
        return {
            audio_categories: 'one',
            rooms: 'one',
            audio_markers: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_rooms': 'rooms',
            'related_audio_categories': 'audio_categories',
            'related_audio_markers': 'audio_markers'
        };
    }
}

module.exports.AudioModel = AudioModel;
