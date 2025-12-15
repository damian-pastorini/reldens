/**
 *
 * Reldens - RespawnEntityOverride
 *
 * Overrides the base respawn entity configuration for admin panel display customization.
 *
 */

const { RespawnEntity } = require('../../../../generated-entities/entities/respawn-entity');

class RespawnEntityOverride extends RespawnEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'layer';
        config.navigationPosition = 500;
        return config;
    }

}

module.exports.RespawnEntityOverride = RespawnEntityOverride;
