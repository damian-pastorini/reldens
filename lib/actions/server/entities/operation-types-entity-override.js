/**
 *
 * Reldens - OperationTypesEntityOverride
 *
 */

const { OperationTypesEntity } = require('../../../../generated-entities/entities/operation-types-entity');

class OperationTypesEntityOverride extends OperationTypesEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 2020;
        return config;
    }

}

module.exports.OperationTypesEntityOverride = OperationTypesEntityOverride;
