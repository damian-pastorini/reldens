/**
 *
 * Reldens - ClientCorePlugin
 *
 * Base class of the client feature plugins that require the GameManager and the EventsManager. The setup props are
 * read and validated once, the missing one is logged with the plugin class name.
 *
 */

const { PluginInterface } = require('../plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class ClientCorePlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @returns {boolean}
     */
    setupCoreProperties(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in '+this.constructor.name+'.');
            return false;
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in '+this.constructor.name+'.');
            return false;
        }
        return true;
    }

}

module.exports.ClientCorePlugin = ClientCorePlugin;
