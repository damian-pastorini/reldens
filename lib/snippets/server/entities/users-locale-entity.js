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
            user_id: {
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps,
            navigationPosition: 820
        };
    }

}

module.exports.UsersLocaleEntity = UsersLocaleEntity;
