/**
 *
 * Reldens - AudioPlayerConfigModel
 *
 */

class AudioPlayerConfigModel
{

    constructor(id, player_id, category_id, enabled)
    {
        this.id = id;
        this.player_id = player_id;
        this.category_id = category_id;
        this.enabled = enabled;
    }

    static get tableName()
    {
        return 'audio_player_config';
    }
    

    static get relationTypes()
    {
        return {
            audio_categories: 'one',
            players: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players',
            'related_audio_categories': 'audio_categories'
        };
    }
}

module.exports.AudioPlayerConfigModel = AudioPlayerConfigModel;
