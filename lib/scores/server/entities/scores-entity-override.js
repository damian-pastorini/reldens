/**
 *
 * Reldens - ScoresEntityOverride
 *
 */

const { ScoresEntity } = require('../../../../generated-entities/entities/scores-entity');
const { sc } = require('@reldens/utils');

class ScoresEntityOverride extends ScoresEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.editProperties = sc.removeFromArray(config.editProperties, [
            'last_player_kill_time',
            'last_npc_kill_time'
        ]);
        return config;
    }

}

module.exports.ScoresEntityOverride = ScoresEntityOverride;
