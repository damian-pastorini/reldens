/**
 *
 * Reldens - UsersLoginEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class UsersLoginEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            user_id: {
                type: 'reference',
                reference: 'users',
                isRequired: true,
                dbType: 'int'
            },
            login_date: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            logout_date: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
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

module.exports.UsersLoginEntity = UsersLoginEntity;
