/**
 *
 * Reldens - PlayersEntityOverride
 *
 * Extends players entity with custom navigation position for admin panel.
 *
 */

const { PlayersEntity } = require('../../../../generated-entities/entities/players-entity');

class PlayersEntityOverride extends PlayersEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 950;
        return config;
    }

}

module.exports.PlayersEntityOverride = PlayersEntityOverride;
