/**
 *
 * Reldens - RewardsModifiersEntityOverride
 *
 */

const { RewardsModifiersEntity } = require('../../../../generated-entities/entities/rewards-modifiers-entity');
const { sc } = require('@reldens/utils');

class RewardsModifiersEntityOverride extends RewardsModifiersEntity
{

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
