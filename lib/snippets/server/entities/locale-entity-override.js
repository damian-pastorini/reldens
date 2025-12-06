/**
 *
 * Reldens - LocaleEntityOverride
 *
 */

const { LocaleEntity } = require('../../../../generated-entities/entities/locale-entity');

class LocaleEntityOverride extends LocaleEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'locale';
        return config;
    }

}

module.exports.LocaleEntityOverride = LocaleEntityOverride;
