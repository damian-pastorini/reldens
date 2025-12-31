/**
 *
 * Reldens - RewardsEntityOverride
 *
 * Overrides the rewards entity configuration for admin panel display with custom navigation positioning.
 *
 */

const { RewardsEntity } = require('../../../../generated-entities/entities/rewards-entity');

class RewardsEntityOverride extends RewardsEntity
{

    /**
     * @param {object} extraProps
     * @returns {object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 600;
        return config;
    }

}

module.exports.RewardsEntityOverride = RewardsEntityOverride;
