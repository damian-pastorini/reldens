/**
 *
 * Reldens - UsersLoginEntityOverride
 *
 * Extends users login entity with custom navigation position for admin panel.
 *
 */

const {UsersLoginEntity} = require('../../../../generated-entities/entities/users-login-entity');

class UsersLoginEntityOverride extends UsersLoginEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 810;
        return config;
    }

}

module.exports.UsersLoginEntityOverride = UsersLoginEntityOverride;
