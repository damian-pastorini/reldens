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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties.splice(editProperties.indexOf('config'), 1);
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AudioMarkersEntity = AudioMarkersEntity;
