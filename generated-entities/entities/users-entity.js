/**
 *
 * Reldens - UsersEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class UsersEntity extends EntityProperties
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
            email: {
                isRequired: true,
                dbType: 'varchar'
            },
            username: {
                isRequired: true,
                dbType: 'varchar'
            },
            password: {
                isRequired: true,
                dbType: 'varchar'
            },
            role_id: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            status: {
                isRequired: true,
                dbType: 'varchar'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            played_time: {
                type: 'number',
                dbType: 'int'
            },
            login_count: {
                type: 'number',
                dbType: 'int'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = [...propertiesKeys];
        showProperties.splice(showProperties.indexOf('password'), 1);
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('password'), 1);
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

module.exports.UsersEntity = UsersEntity;
