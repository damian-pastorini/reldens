/**
 *
 * Reldens - ConfigTypesEntityOverride
 *
 */

const { ConfigTypesEntity } = require('../../../../generated-entities/entities/config-types-entity');

class ConfigTypesEntityOverride extends ConfigTypesEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 2010;
        return config;
    }

}

module.exports.ConfigTypesEntityOverride = ConfigTypesEntityOverride;
