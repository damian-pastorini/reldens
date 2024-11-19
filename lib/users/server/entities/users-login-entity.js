/**
 *
 * Reldens - UsersLoginEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class UsersLoginEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            user_id: {
                type: 'reference',
                reference: 'users',
                isRequired: true
            },
            login_date: {
                type: 'datetime',
                isRequired: true
            },
            logout_date: {
                type: 'datetime'
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray([...editProperties], ['id']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.UsersLoginEntity = UsersLoginEntity;
