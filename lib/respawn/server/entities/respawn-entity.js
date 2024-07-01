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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.RespawnEntity = RespawnEntity;
