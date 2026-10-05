/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

class AudioCategoriesModel
{

    static get tableName()
    {
        return 'audio_categories';
    }

    static get relationMappings()
    {
        return {
            related_audio: {
                relation: 'HasManyRelation',
                tableName: 'audio',
                from: 'id',
                to: 'category_id'
            },
            related_audio_player_config: {
                relation: 'HasManyRelation',
                tableName: 'audio_player_config',
                from: 'id',
                to: 'category_id'
            }
        };
    }
}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
