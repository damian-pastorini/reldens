/**
 *
 * Reldens - AudioCategoriesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

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
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

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
