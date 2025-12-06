/**
 *
 * Reldens - AudioEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class AudioEntity extends EntityProperties
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
            audio_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            files_name: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            },
            config: {
                dbType: 'varchar'
            },
            room_id: {
                type: 'reference',
                reference: 'rooms',
                dbType: 'int'
            },
            category_id: {
                type: 'reference',
                reference: 'audio_categories',
                dbType: 'int'
            },
            enabled: {
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
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('files_name'), 1);
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

module.exports.AudioEntity = AudioEntity;
