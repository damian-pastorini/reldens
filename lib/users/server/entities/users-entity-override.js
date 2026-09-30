/**
 *
 * Reldens - UsersEntityOverride
 *
 * Extends users entity with custom title property and navigation position for admin panel, the registration origin is
 * set by the system so it is not editable.
 *
 */

const { UsersEntity } = require('../../../../generated-entities/entities/users-entity');
const { sc } = require('@reldens/utils');

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
        config.editProperties = sc.removeFromArray([...config.editProperties], ['origin']);
        return config;
    }

}

module.exports.UsersEntityOverride = UsersEntityOverride;
