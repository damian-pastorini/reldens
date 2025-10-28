/**
 *
 * Reldens - AudioPlayerConfigEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class AudioPlayerConfigEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true,
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
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
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

module.exports.AudioPlayerConfigEntity = AudioPlayerConfigEntity;
