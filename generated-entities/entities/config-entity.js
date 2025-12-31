/**
 *
 * Reldens - ConfigEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ConfigEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            scope: {
                isRequired: true,
                dbType: 'varchar'
            },
            path: {
                isRequired: true,
                dbType: 'varchar'
            },
            value: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            },
            type: {
                type: 'reference',
                reference: 'config_types',
                isRequired: true,
                dbType: 'int'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('value'), 1);
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

module.exports.ConfigEntity = ConfigEntity;
