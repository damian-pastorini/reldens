/**
 *
 * Reldens - RespawnEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class RespawnEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
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
            layer: {
                isTitle: true,
                isRequired: true
            }

        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.RespawnEntity = RespawnEntity;
