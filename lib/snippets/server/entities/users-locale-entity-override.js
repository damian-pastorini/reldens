/**
 *
 * Reldens - UsersLocaleEntityOverride
 *
 * Overrides the users locale entity configuration for the admin panel.
 *
 */

const { UsersLocaleEntity } = require('../../../../generated-entities/entities/users-locale-entity');

class UsersLocaleEntityOverride extends UsersLocaleEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 820;
        return config;
    }

}

module.exports.UsersLocaleEntityOverride = UsersLocaleEntityOverride;
