/**
 *
 * Reldens - Snippets Client Plugin
 *
 */

const { Translator } = require('../translator');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class SnippetsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        let snippets = Object.assign({}, this.gameManager.config.client.snippets);
        console.log({snippets});
        this.events.on('reldens.startEngineScene', async (roomEvents, player, room, previousScene) => {
            // this.gameManager.translator = new Translator();
            let snippets2 = Object.assign({}, this.gameManager.config.client.snippets);
            console.log({snippets2});
        });
    }

}

module.exports.SnippetsPlugin = SnippetsPlugin;
