/**
 *
 * Reldens - RewardsEntityOverride
 *
 */

const { RewardsEntity } = require('../../../../generated-entities/entities/rewards-entity');

class RewardsEntityOverride extends RewardsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 600;
        return config;
    }

}

module.exports.RewardsEntityOverride = RewardsEntityOverride;
