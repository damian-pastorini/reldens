/**
 *
 * Reldens - AudioCategoriesEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class AudioCategoriesEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            category_key: {
                isTitle: true,
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

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.AudioCategoriesEntity = AudioCategoriesEntity;
