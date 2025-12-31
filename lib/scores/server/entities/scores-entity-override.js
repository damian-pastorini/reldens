/**
 *
 * Reldens - ScoresEntityOverride
 *
 * Customizes the scores entity configuration for the admin panel.
 * Removes auto-populated timestamp fields from the edit form.
 *
 */

const { ScoresEntity } = require('../../../../generated-entities/entities/scores-entity');
const { sc } = require('@reldens/utils');

class ScoresEntityOverride extends ScoresEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
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
