/**
 *
 * Reldens - UsersLocaleEntityOverride
 *
 */

const { UsersLocaleEntity } = require('../../../../generated-entities/entities/users-locale-entity');

class UsersLocaleEntityOverride extends UsersLocaleEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 820;
        return config;
    }

}

module.exports.UsersLocaleEntityOverride = UsersLocaleEntityOverride;
