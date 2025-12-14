/**
 *
 * Reldens - RewardsModifiersEntityOverride
 *
 * Overrides the rewards modifiers entity configuration for admin panel display with custom title and filtered list properties.
 *
 */

const { RewardsModifiersEntity } = require('../../../../generated-entities/entities/rewards-modifiers-entity');
const { sc } = require('@reldens/utils');

class RewardsModifiersEntityOverride extends RewardsModifiersEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'key';
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
        ]);
        return config;
    }

}

module.exports.RewardsModifiersEntityOverride = RewardsModifiersEntityOverride;
