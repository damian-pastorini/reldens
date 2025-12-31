/**
 *
 * Reldens - StatsEntityOverride
 *
 * Extends stats entity with customized list properties for admin panel.
 *
 */

const { StatsEntity } = require('../../../../generated-entities/entities/stats-entity');

class StatsEntityOverride extends StatsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.listProperties.splice(config.listProperties.indexOf('description'), 1);
        return config;
    }

}

module.exports.StatsEntityOverride = StatsEntityOverride;
