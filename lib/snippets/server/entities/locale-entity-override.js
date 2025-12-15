/**
 *
 * Reldens - LocaleEntityOverride
 *
 * Overrides the locale entity configuration for the admin panel.
 *
 */

const { LocaleEntity } = require('../../../../generated-entities/entities/locale-entity');

class LocaleEntityOverride extends LocaleEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'locale';
        return config;
    }

}

module.exports.LocaleEntityOverride = LocaleEntityOverride;
