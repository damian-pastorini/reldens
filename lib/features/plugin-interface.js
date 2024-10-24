/**
 *
 * Reldens - Plugin Interface
 *
 */

const { Logger } = require('@reldens/utils');

class PluginInterface
{

    /**
     * {
     *     requiredProperties,
     *     events,
     *     dataServer,
     *     config,
     *     featuresManager,
     *     themeManager
     * }
     */
    async setup(props)
    {
        Logger.error('Setup plugin not implemented.', props);
    }

}

module.exports.PluginInterface = PluginInterface;
