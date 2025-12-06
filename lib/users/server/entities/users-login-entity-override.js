/**
 *
 * Reldens - UsersLoginEntityOverride
 *
 */

const {UsersLoginEntity} = require('../../../../generated-entities/entities/users-login-entity');

class UsersLoginEntityOverride extends UsersLoginEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 810;
        return config;
    }

}

module.exports.UsersLoginEntityOverride = UsersLoginEntityOverride;
