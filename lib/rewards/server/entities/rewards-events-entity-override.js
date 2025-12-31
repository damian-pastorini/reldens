/**
 *
 * Reldens - RewardsEventsEntityOverride
 *
 * Overrides the rewards events entity configuration for admin panel display with custom title and list properties.
 *
 */

const { RewardsEventsEntity } = require('../../../../generated-entities/entities/rewards-events-entity');

class RewardsEventsEntityOverride extends RewardsEventsEntity
{

    /**
     * @param {object} extraProps
     * @returns {object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'event_key';
        config.listProperties.splice(config.listProperties.indexOf('event_data'), 1);
        return config;
    }

}

module.exports.RewardsEventsEntityOverride = RewardsEventsEntityOverride;
