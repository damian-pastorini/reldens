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
        let properties = {
            id: {},
            audio_id: {
                type: 'reference',
                reference: 'audio',
                isRequired: true
            },
            marker_key: {
                isTitle: true,
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

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.AudioMarkersEntity = AudioMarkersEntity;
