/**
 *
 * Reldens - PlayersStatsEntityOverride
 *
 * Extends players stats entity with customized edit properties for admin panel.
 *
 */

const { PlayersStatsEntity } = require('../../../../generated-entities/entities/players-stats-entity');
const { sc } = require('@reldens/utils');

class PlayersStatsEntityOverride extends PlayersStatsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.editProperties = sc.removeFromArray(config.editProperties, ['player_id', 'stat_id']);
        config.navigationPosition = 970;
        return config;
    }

}

module.exports.PlayersStatsEntityOverride = PlayersStatsEntityOverride;
