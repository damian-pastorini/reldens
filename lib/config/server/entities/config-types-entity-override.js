/**
 *
 * Reldens - ConfigTypesEntityOverride
 *
 * Extends config types entity with custom navigation position for admin panel.
 *
 */

const { ConfigTypesEntity } = require('../../../../generated-entities/entities/config-types-entity');

class ConfigTypesEntityOverride extends ConfigTypesEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 2010;
        return config;
    }

}

module.exports.ConfigTypesEntityOverride = ConfigTypesEntityOverride;
