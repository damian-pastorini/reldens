/**
 *
 * Reldens - PlayersStatsEntityOverride
 *
 */

const { PlayersStatsEntity } = require('../../../../generated-entities/entities/players-stats-entity');
const { sc } = require('@reldens/utils');

class PlayersStatsEntityOverride extends PlayersStatsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.editProperties = sc.removeFromArray(config.editProperties, ['player_id', 'stat_id']);
        config.navigationPosition = 970;
        return config;
    }

}

module.exports.PlayersStatsEntityOverride = PlayersStatsEntityOverride;
