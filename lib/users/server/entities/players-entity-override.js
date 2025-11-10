/**
 *
 * Reldens - PlayersEntityOverride
 *
 */

const { PlayersEntity } = require('../../../../generated-entities/entities/players-entity');

class PlayersEntityOverride extends PlayersEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 950;
        return config;
    }

}

module.exports.PlayersEntityOverride = PlayersEntityOverride;
