/**
 *
 * Reldens - AudioCategoriesModel
 *
 */

const { ModelClassDeprecated } = require('@reldens/storage');

class AudioCategoriesModel extends ModelClassDeprecated
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
