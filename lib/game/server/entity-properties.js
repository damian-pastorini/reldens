/**
 *
 * Reldens - EntityProperties
 *
 */

const { Logger } = require('@reldens/utils');

class EntityProperties
{

    static propertiesDefinition()
    {
        Logger.alert('Method not implemented propertiesDefinition().');
        return {};
    }

    static propertiesConfig(extraProps)
    {
        Logger.alert('Method not implemented propertiesConfig().', extraProps);
        return {};
    }

}

module.exports.EntityProperties = EntityProperties;
