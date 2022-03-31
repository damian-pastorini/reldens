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
            object_class_key: {
                isTitle: true,
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
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'client_key',
            'private_params',
            'client_params'
        ]);
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

module.exports.ObjectsEntity = ObjectsEntity;
