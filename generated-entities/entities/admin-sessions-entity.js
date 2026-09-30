/**
 *
 * Reldens - AdminSessionsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class AdminSessionsEntity extends EntityProperties
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
            sid: {
                isRequired: true,
                isUnique: true,
                dbType: 'varchar'
            },
            data: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            },
            expires: {
                type: 'number',
                isRequired: true,
                dbType: 'bigint'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('data'), 1);
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

module.exports.AdminSessionsEntity = AdminSessionsEntity;
