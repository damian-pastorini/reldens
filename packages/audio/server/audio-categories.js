/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class AudioCategoriesModel extends ModelClass
{

    static get tableName()
    {
        return 'audio_categories';
    }

}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
