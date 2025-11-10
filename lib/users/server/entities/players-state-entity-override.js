/**
 *
 * Reldens - PlayersStateEntityOverride
 *
 */

const { PlayersStateEntity } = require('../../../../generated-entities/entities/players-state-entity');

class PlayersStateEntityOverride extends PlayersStateEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.editProperties.splice(config.editProperties.indexOf('player_id'), 1)
        config.navigationPosition = 960;
        return config;
    }

}

module.exports.PlayersStateEntityOverride = PlayersStateEntityOverride;
