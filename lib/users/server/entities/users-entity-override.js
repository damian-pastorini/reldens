/**
 *
 * Reldens - UsersEntityOverride
 *
 * Extends users entity with custom title property and navigation position for admin panel.
 *
 */

const { UsersEntity } = require('../../../../generated-entities/entities/users-entity');

class UsersEntityOverride extends UsersEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'email';
        config.navigationPosition = 800;
        return config;
    }

}

module.exports.UsersEntityOverride = UsersEntityOverride;
