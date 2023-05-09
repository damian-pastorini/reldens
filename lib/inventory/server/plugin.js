/**
 *
 * Reldens - Inventory Server Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { InventoryMessageActions } = require('./message-actions');
const { PlayerSubscriber } = require('./subscribers/player-subscriber');
const { ServerSubscriber } = require('./subscribers/server-subscriber');
const { ModelsManager } = require('@reldens/items-system/lib/server/storage/models-manager');
const { Logger, sc } = require('@reldens/utils');

class InventoryPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            this.modelsManager = new ModelsManager({dataServer: event.serverManager.dataServer});
        });
        this.events.on('reldens.serverReady', async (event) => {
            await ServerSubscriber.initializeInventory(event.serverManager.configManager, this.modelsManager);
        });
        this.events.on('reldens.createPlayerStatsAfter', async (client, authResult, currentPlayer, room) => {
            await PlayerSubscriber.createPlayerInventory(client, currentPlayer, room, this.events, this.modelsManager);
        });
        // when the client sent a message to any room it will be checked by all the global messages defined:
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.inventory = new InventoryMessageActions();
        });
    }

}

module.exports.InventoryPlugin = InventoryPlugin;
