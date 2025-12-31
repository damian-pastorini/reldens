/**
 *
 * Reldens - AudioCategoriesEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class AudioCategoriesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            category_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            category_label: {
                isRequired: true,
                dbType: 'varchar'
            },
            enabled: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            single_audio: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = propertiesKeys;
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.AudioCategoriesEntity = AudioCategoriesEntity;
