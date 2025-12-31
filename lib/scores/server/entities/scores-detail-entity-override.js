/**
 *
 * Reldens - ScoresDetailEntityOverride
 *
 * Customizes the scores detail entity configuration for the admin panel.
 * Removes the auto-populated kill_time field from the edit form.
 *
 */

const { ScoresDetailEntity } = require('../../../../generated-entities/entities/scores-detail-entity');

class ScoresDetailEntityOverride extends ScoresDetailEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.editProperties.splice(config.editProperties.indexOf('kill_time'), 1);
        return config;
    }

}

module.exports.ScoresDetailEntityOverride = ScoresDetailEntityOverride;
