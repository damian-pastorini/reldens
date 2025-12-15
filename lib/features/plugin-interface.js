/**
 *
 * Reldens - Plugin Interface
 *
 * Base interface for client and server feature plugins.
 *
 */

const { Logger } = require('@reldens/utils');

class PluginInterface
{

    /**
     * @param {Object} props
     * @param {Array<string>} [props.requiredProperties]
     * @param {Object} [props.events]
     * @param {Object} [props.dataServer]
     * @param {Object} [props.config]
     * @param {Object} [props.featuresManager]
     * @param {Object} [props.themeManager]
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        Logger.error('Setup plugin not implemented.', props);
        return false;
    }

}

module.exports.PluginInterface = PluginInterface;
