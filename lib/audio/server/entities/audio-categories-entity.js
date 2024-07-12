/**
 *
 * Reldens - AudioCategoriesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AudioCategoriesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'category_key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            category_label: {
                isRequired: true
            },
            enabled: {
                type: 'boolean',
                isRequired: true
            },
            single_audio: {
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AudioCategoriesEntity = AudioCategoriesEntity;
