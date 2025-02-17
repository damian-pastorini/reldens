/**
 *
 * Reldens - RespawnEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const {sc} = require("@reldens/utils");

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
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps,
            navigationPosition: 500
        };
    }

}

module.exports.RespawnEntity = RespawnEntity;
