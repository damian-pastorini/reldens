/**
 *
 * Reldens - ClanEntityOverride
 *
 * Customizes admin panel configuration for the Clan entity.
 * Sets title property and navigation position for the admin interface.
 *
 */

const { ClanEntity } = require('../../../../generated-entities/entities/clan-entity');

class ClanEntityOverride extends ClanEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'name';
        config.navigationPosition = 900;
        return config;
    }

}

module.exports.ClanEntityOverride = ClanEntityOverride;
