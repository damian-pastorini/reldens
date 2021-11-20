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

    static loadEnabled()
    {
        return this.query().where('enabled', 1);
    }

}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
