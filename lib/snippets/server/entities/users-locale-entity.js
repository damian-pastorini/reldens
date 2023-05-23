/**
 *
 * Reldens - UsersLocaleEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class UsersLocaleEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            locale_id: {
                isRequired: true
            },
            player_id: {
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.UsersLocaleEntity = UsersLocaleEntity;
