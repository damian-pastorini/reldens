/**
 *
 * Reldens - ScoresDetailEntityOverride
 *
 */

const { ScoresDetailEntity } = require('../../../../generated-entities/entities/scores-detail-entity');

class ScoresDetailEntityOverride extends ScoresDetailEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'label';
        config.editProperties.splice(config.editProperties.indexOf('kill_time'), 1);
        return config;
    }

}

module.exports.ScoresDetailEntityOverride = ScoresDetailEntityOverride;
