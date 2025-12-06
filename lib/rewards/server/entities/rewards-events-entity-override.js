/**
 *
 * Reldens - RewardsEventsEntityOverride
 *
 */

const { RewardsEventsEntity } = require('../../../../generated-entities/entities/rewards-events-entity');

class RewardsEventsEntityOverride extends RewardsEventsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'event_key';
        config.listProperties.splice(config.listProperties.indexOf('event_data'), 1);
        return config;
    }

}

module.exports.RewardsEventsEntityOverride = RewardsEventsEntityOverride;
