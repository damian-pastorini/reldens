/**
 *
 * Reldens - FeaturesEntityOverride
 *
 */

const { FeaturesEntity } = require('../../../../generated-entities/entities/features-entity');

class FeaturesEntityOverride extends FeaturesEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 1400;
        config.listProperties.splice(config.listProperties.indexOf('code'), 1);
        return config;
    }

}

module.exports.FeaturesEntityOverride = FeaturesEntityOverride;
