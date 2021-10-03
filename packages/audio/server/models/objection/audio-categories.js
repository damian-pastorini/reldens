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

    static loadEnabled()
    {
        return this.query().where('enabled', 1);
    }

}

module.exports.AudioCategoriesModel = AudioCategoriesModel;
