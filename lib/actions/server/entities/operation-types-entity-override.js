/**
 *
 * Reldens - OperationTypesEntityOverride
 *
 * Custom entity override for operation types with admin panel configuration.
 *
 */

const { OperationTypesEntity } = require('../../../../generated-entities/entities/operation-types-entity');

class OperationTypesEntityOverride extends OperationTypesEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 2020;
        return config;
    }

}

module.exports.OperationTypesEntityOverride = OperationTypesEntityOverride;
