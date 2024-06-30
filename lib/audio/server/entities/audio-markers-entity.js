/**
 *
 * Reldens - AudioMarkersEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AudioMarkersEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'marker_key';
        let properties = {
            id: {},
            audio_id: {
                type: 'reference',
                reference: 'audio',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            start: {
                type: 'number',
                isRequired: true
            },
            duration: {
                type: 'number',
                isRequired: true
            },
            config: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(editPropertiesKeys.indexOf('config'), 1);
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

module.exports.AudioMarkersEntity = AudioMarkersEntity;
