/**
 *
 * Reldens - RespawnEntityOverride
 *
 */

const { RespawnEntity } = require('../../../../generated-entities/entities/respawn-entity');

class RespawnEntityOverride extends RespawnEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'layer';
        config.navigationPosition = 500;
        return config;
    }

}

module.exports.RespawnEntityOverride = RespawnEntityOverride;
