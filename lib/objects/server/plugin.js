/**
 *
 * Reldens - Objects Server Plugin
 *
 * Server-side plugin for managing game objects configuration and class types.
 *
 */

const { ObjectsClassTypeHandler } = require('./handler/objects-class-type');
const { PluginInterface } = require('../../features/plugin-interface');
const { ErrorManager, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class ObjectsPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    setup(props)
    {
        /** @type {ObjectsClassTypeHandler|false} */
        this.objectsClassTypeHandler = false;
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            ErrorManager.error('EventsManager undefined in RewardsPlugin.');
        }
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverConfigFeaturesReady', async (event) => {
            this.objectsClassTypeHandler = new ObjectsClassTypeHandler(event.configProcessor.dataServer);
            await this.objectsClassTypeHandler.setOnConfig(event.configProcessor);
        });
        return true;
    }

}

module.exports.ObjectsPlugin = ObjectsPlugin;
