/**
 *
 * Reldens - ObjectsEntityOverride
 *
 * Customizes the objects entity configuration for the admin panel.
 *
 */

const { ObjectsEntity } = require('../../../../generated-entities/entities/objects-entity');

class ObjectsEntityOverride extends ObjectsEntity
{

    /**
     * @param {Object} [extraProps]
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 400;
        return config;
    }

}

module.exports.ObjectsEntityOverride = ObjectsEntityOverride;
