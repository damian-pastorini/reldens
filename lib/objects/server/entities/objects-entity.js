/**
 *
 * Reldens - ObjectsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class ObjectsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'object_class_key';
        let properties = {
            id: {},
            room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true
            },
            layer_name: {
                isRequired: true
            },
            tile_index: {
                type: 'number'
            },
            class_type: {
                type: 'reference',
                reference: 'objects_types'
            },
            [titleProperty]: {
                isRequired: true
            },
            client_key: {
                isRequired: true
            },
            title: {},
            private_params: {},
            client_params: {},
            enabled: {
                type: 'boolean',
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
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'client_key',
            'private_params',
            'client_params'
        ]);
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

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

module.exports.ObjectsEntity = ObjectsEntity;
