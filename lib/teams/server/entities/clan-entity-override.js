/**
 *
 * Reldens - ClanEntityOverride
 *
 */

const { ClanEntity } = require('../../../../generated-entities/entities/clan-entity');

class ClanEntityOverride extends ClanEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'name';
        config.navigationPosition = 900;
        return config;
    }

}

module.exports.ClanEntityOverride = ClanEntityOverride;
