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

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AudioCategoriesEntity = AudioCategoriesEntity;
