/**
 *
 * Reldens - QuestsProgressEntityOverride
 *
 * Overrides the quests progress entity configuration for admin panel display with custom navigation positioning.
 *
 */

const { QuestsProgressEntity } = require('../../../../generated-entities/entities/quests-progress-entity');

class QuestsProgressEntityOverride extends QuestsProgressEntity
{

    /**
     * @param {object} extraProps
     * @returns {object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 650;
        return config;
    }

}

module.exports.QuestsProgressEntityOverride = QuestsProgressEntityOverride;
