/**
 *
 * Reldens - UsersPasswordResetsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class UsersPasswordResetsEntity extends EntityProperties
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
            user_id: {
                type: 'reference',
                reference: 'users',
                alias: 'related_users',
                onDelete: 'cascade',
                isRequired: true,
                isUnique: true,
                dbType: 'int'
            },
            sent_at: {
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

module.exports.UsersPasswordResetsEntity = UsersPasswordResetsEntity;
