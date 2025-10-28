/**
 *
 * Reldens - UsersLocaleEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class UsersLocaleEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            locale_id: {
                type: 'reference',
                reference: 'locale',
                dbType: 'int'
            },
            user_id: {
                type: 'reference',
                reference: 'users',
                dbType: 'int'
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

module.exports.UsersLocaleEntity = UsersLocaleEntity;
