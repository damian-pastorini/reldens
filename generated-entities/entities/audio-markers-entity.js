/**
 *
 * Reldens - AudioMarkersEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class AudioMarkersEntity extends EntityProperties
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
            audio_id: {
                type: 'reference',
                reference: 'audio',
                isRequired: true,
                dbType: 'int'
            },
            marker_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            start: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            duration: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            config: {
                type: 'textarea',
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('config'), 1);
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

module.exports.AudioMarkersEntity = AudioMarkersEntity;
