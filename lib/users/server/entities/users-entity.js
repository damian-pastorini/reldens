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
        let properties = {
            id: {},
            email: {
                isTitle: true,
                isRequired: true,
                validate: {
                    isEmail: true
                }
            },
            username: {
                isRequired: true
            },
            password: {
                type: 'password',
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
        let editProperties = sc.removeFromArray([...listProperties], [
            'id',
            'created_at',
            'updated_at'
        ]);

        showProperties.splice(listProperties.indexOf('password'), 1);
        listProperties.splice(listProperties.indexOf('password'), 1);

        return Object.assign({
            listProperties,
            showProperties,
            filterProperties: listProperties,
            editProperties,
            properties
        }, extraProps);
    }

}

module.exports.UsersEntity = UsersEntity;
