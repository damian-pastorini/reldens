/**
 *
 * Reldens - UsersEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class UsersEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'email';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true,
                validate: {
                    isEmail: true
                }
            },
            username: {
                isRequired: true
            },
            password: {
                isRequired: true
            },
            role_id: {
                isRequired: true
            },
            status: {
                isRequired: true
            },
            created_at: {
                type: 'datetime',
                isRequired: true
            },
            updated_at: {
                type: 'datetime',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);
        showProperties.splice(listProperties.indexOf('password'), 1);
        listProperties.splice(listProperties.indexOf('password'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps,
            navigationPosition: 800
        };
    }

}

module.exports.UsersEntity = UsersEntity;
