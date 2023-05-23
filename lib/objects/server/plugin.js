/**
 *
 * Reldens - Objects Server Plugin
 *
 */

const { ObjectsClassTypeHandler } = require('./handler/objects-class-type');
const { PluginInterface } = require('../../features/plugin-interface');
const { ErrorManager, sc } = require('@reldens/utils');

class ObjectsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            ErrorManager.error('EventsManager undefined in RewardsPlugin.');
        }
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverConfigFeaturesReady', async (event) => {
            this.objectsClassTypeHandler = new ObjectsClassTypeHandler(event.configProcessor.dataServer);
            await this.objectsClassTypeHandler.setOnConfig(event.configProcessor);
        });
    }

}

module.exports.ObjectsPlugin = ObjectsPlugin;
