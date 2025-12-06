/**
 *
 * Reldens - UsersEntityOverride
 *
 */

const { UsersEntity } = require('../../../../generated-entities/entities/users-entity');

class UsersEntityOverride extends UsersEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'email';
        config.navigationPosition = 800;
        return config;
    }

}

module.exports.UsersEntityOverride = UsersEntityOverride;
