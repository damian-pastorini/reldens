/**
 *
 * Reldens - UsersEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class UsersEntity extends AdminEntityProperties
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

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'id',
            'created_at',
            'updated_at'
        ]);

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('password'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.UsersEntity = UsersEntity;
