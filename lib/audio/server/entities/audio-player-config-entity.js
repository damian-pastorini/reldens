/**
 *
 * Reldens - AudioPlayerConfigEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AudioPlayerConfigEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            category_id: {
                type: 'reference',
                reference: 'audio_categories'
            },
            enabled: {
                type: 'boolean'
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: listPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.AudioPlayerConfigEntity = AudioPlayerConfigEntity;
