/**
 *
 * Reldens - SetupServerProperties
 *
 * Properties container for server feature plugin setup.
 *
 */

const { PropertiesHandler } = require('../../game/properties-handler');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('./manager').FeaturesManager} FeaturesManager
 * @typedef {import('../../game/server/theme-manager').ThemeManager} ThemeManager
 */
class SetupServerProperties extends PropertiesHandler
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super();
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {ConfigManager} */
        this.config = sc.get(props, 'config', {});
        /** @type {FeaturesManager|boolean} */
        this.featuresManager = sc.get(props, 'featuresManager', false);
        /** @type {ThemeManager|boolean} */
        this.themeManager = sc.get(props, 'themeManager', false);
        /** @type {Array<string>} */
        this.requiredProperties = Object.keys(this);
    }

}

module.exports.SetupServerProperties = SetupServerProperties
