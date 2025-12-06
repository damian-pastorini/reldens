/**
 *
 * Reldens - ConfigEntityOverride
 *
 */

const { ConfigEntity } = require('../../../../generated-entities/entities/config-entity');

class ConfigEntityOverride extends ConfigEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 2000;
        config.sort = {sortBy: 'path'};
        return config;
    }

}

module.exports.ConfigEntityOverride = ConfigEntityOverride;
