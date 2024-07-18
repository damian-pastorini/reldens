/**
 *
 * Reldens - RespawnEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RespawnEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'layer';
        let properties = {
            id: {},
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            respawn_time: {
                type: 'number',
                isRequired: true
            },
            instances_limit: {
                type: 'number',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            }

        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

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

module.exports.RespawnEntity = RespawnEntity;
