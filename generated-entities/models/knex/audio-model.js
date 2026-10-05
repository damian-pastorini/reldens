/**
 *
 * Reldens - AudioModel
 *
 */

class AudioModel
{

    static get tableName()
    {
        return 'audio';
    }

    static get relationMappings()
    {
        return {
            related_rooms: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'room_id',
                to: 'id'
            },
            related_audio_categories: {
                relation: 'BelongsToOneRelation',
                tableName: 'audio_categories',
                from: 'category_id',
                to: 'id'
            },
            related_audio_markers: {
                relation: 'HasManyRelation',
                tableName: 'audio_markers',
                from: 'id',
                to: 'audio_id'
            }
        };
    }
}

module.exports.AudioModel = AudioModel;
