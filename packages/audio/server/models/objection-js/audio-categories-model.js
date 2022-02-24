/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AudioCategoriesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'audio_categories';
    }

}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
