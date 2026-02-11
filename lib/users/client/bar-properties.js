/**
 *
 * Reldens - BarProperties
 *
 * Model for validating and storing bar property configuration.
 *
 */

const { sc } = require('@reldens/utils');

class BarProperties
{

    /**
     * @param {string} statKey
     * @param {Object} config
     */
    constructor(statKey, config)
    {
        this.statKey = statKey;
        this.enabled = sc.get(config, 'enabled', false);
        this.label = sc.get(config, 'label', '');
        this.activeColor = sc.get(config, 'activeColor', '');
        this.inactiveColor = sc.get(config, 'inactiveColor', '');
        this.ready = this.enabled && this.label && this.activeColor && this.inactiveColor;
    }

}

module.exports.BarProperties = BarProperties;
