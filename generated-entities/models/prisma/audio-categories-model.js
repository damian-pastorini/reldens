/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

class AudioCategoriesModel
{

    constructor(id, category_key, category_label, enabled, single_audio, created_at, updated_at)
    {
        this.id = id;
        this.category_key = category_key;
        this.category_label = category_label;
        this.enabled = enabled;
        this.single_audio = single_audio;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'audio_categories';
    }
    

    static get relationTypes()
    {
        return {
            audio: 'many',
            audio_player_config: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_audio': 'audio',
            'related_audio_player_config': 'audio_player_config'
        };
    }
}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
