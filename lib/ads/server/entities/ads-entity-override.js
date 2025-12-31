/**
 *
 * Reldens - AdsEntityOverride
 *
 * Customizes the ads entity properties for the admin panel display.
 *
 */

const { AdsEntity } = require('../../../../generated-entities/entities/ads-entity');
const { sc } = require('@reldens/utils');

class AdsEntityOverride extends AdsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'top',
            'bottom',
            'left',
            'right'
        ]);
        config.navigationPosition = 1200;
        return config;
    }

}

module.exports.AdsEntityOverride = AdsEntityOverride;
