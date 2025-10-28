/**
 *
 * Reldens - ObjectsAssetsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ObjectsAssetsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            object_asset_id: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true,
                dbType: 'int'
            },
            asset_type: {
                isRequired: true,
                dbType: 'varchar'
            },
            asset_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            asset_file: {
                isRequired: true,
                dbType: 'varchar'
            },
            extra_params: {
                type: 'textarea',
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('extra_params'), 1);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.ObjectsAssetsEntity = ObjectsAssetsEntity;
