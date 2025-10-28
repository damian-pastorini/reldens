/**
 *
 * Reldens - ObjectsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class ObjectsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'title';
        let properties = {
            id: {
                dbType: 'int'
            },
            room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true,
                dbType: 'int'
            },
            layer_name: {
                isRequired: true,
                dbType: 'varchar'
            },
            tile_index: {
                type: 'number',
                dbType: 'int'
            },
            class_type: {
                type: 'reference',
                reference: 'objects_types',
                dbType: 'int'
            },
            object_class_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            client_key: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            },
            [titleProperty]: {
                dbType: 'varchar'
            },
            private_params: {
                type: 'textarea',
                dbType: 'text'
            },
            client_params: {
                type: 'textarea',
                dbType: 'text'
            },
            enabled: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = sc.removeFromArray([...propertiesKeys], ['client_key', 'private_params', 'client_params']);
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
