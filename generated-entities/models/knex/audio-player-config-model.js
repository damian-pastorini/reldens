/**
 *
 * Reldens - AudioPlayerConfigModel
 *
 */

class AudioPlayerConfigModel
{

    static get tableName()
    {
        return 'audio_player_config';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            },
            related_audio_categories: {
                relation: 'BelongsToOneRelation',
                tableName: 'audio_categories',
                from: 'category_id',
                to: 'id'
            }
        };
    }
}

module.exports.AudioPlayerConfigModel = AudioPlayerConfigModel;
