/**
 *
 * Reldens - PlayersStateEntityOverride
 *
 * Extends players state entity with customized edit properties for admin panel.
 *
 */

const { PlayersStateEntity } = require('../../../../generated-entities/entities/players-state-entity');

class PlayersStateEntityOverride extends PlayersStateEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.editProperties.splice(config.editProperties.indexOf('player_id'), 1)
        config.navigationPosition = 960;
        return config;
    }

}

module.exports.PlayersStateEntityOverride = PlayersStateEntityOverride;
