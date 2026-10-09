/**
 *
 * Reldens - AudioCategoriesEntityOverride
 *
 * Extends the audio categories entity with the category label as title, shown in the related entities selectors.
 *
 */

const { AudioCategoriesEntity } = require('../../../../generated-entities/entities/audio-categories-entity');

class AudioCategoriesEntityOverride extends AudioCategoriesEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'category_label';
        return config;
    }

}

module.exports.AudioCategoriesEntityOverride = AudioCategoriesEntityOverride;
