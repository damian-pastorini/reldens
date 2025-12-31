/**
 *
 * Reldens - EntityProperties
 *
 * Base class for defining entity property configurations. Designed to be extended by entity override
 * classes that provide custom property definitions and configurations for the admin panel. Each
 * entity override class should implement propertiesDefinition() and propertiesConfig() methods to
 * define how entity fields are displayed and edited in the admin interface.
 *
 */

const { Logger } = require('@reldens/utils');

class EntityProperties
{

    /**
     * @returns {Object} Entity properties definition object (to be implemented by subclasses)
     */
    static propertiesDefinition()
    {
        Logger.alert('Method not implemented propertiesDefinition().');
        return {};
    }

    /**
     * @param {Object} extraProps
     * @returns {Object} Entity properties configuration object (to be implemented by subclasses)
     */
    static propertiesConfig(extraProps)
    {
        Logger.alert('Method not implemented propertiesConfig().', extraProps);
        return {};
    }

}

module.exports.EntityProperties = EntityProperties;
