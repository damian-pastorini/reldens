/**
 *
 * Reldens - ConfigEntityOverride
 *
 * Extends config entity with custom navigation position and sorting for admin panel.
 *
 */

const { ConfigEntity } = require('../../../../generated-entities/entities/config-entity');

class ConfigEntityOverride extends ConfigEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 2000;
        config.sort = {sortBy: 'path'};
        return config;
    }

}

module.exports.ConfigEntityOverride = ConfigEntityOverride;
