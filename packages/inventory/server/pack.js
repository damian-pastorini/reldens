/**
 *
 * Reldens - Inventory Server Package
 *
 */

const { PackInterface } = require('../../features/pack-interface');
const { InventoryMessageActions } = require('./message-actions');
const { PlayerSubscriber } = require('./subscribers/player-subscriber');
const { ServerSubscriber } = require('./subscribers/server-subscriber');
const { ModelsManager } = require('@reldens/items-system/lib/server/storage/models-manager');
const { Logger, sc } = require('@reldens/utils');

class InventoryPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPack.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            this.inventoryModelsManager = new ModelsManager({dataServer: event.serverManager.dataServer});
        });
        this.events.on('reldens.serverReady', async (event) => {
            await ServerSubscriber.initializeInventory(
                event.serverManager.configManager.processor,
                this.inventoryModelsManager
            );
        });
        this.events.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, room) => {
            await PlayerSubscriber.createPlayerInventory(
                client,
                authResult,
                currentPlayer,
                room,
                this.events,
                this.inventoryModelsManager
            );
        });
        // when the client sent a message to any room it will be checked by all the global messages defined:
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.inventory = InventoryMessageActions;
        });
    }

}

module.exports.InventoryPack = InventoryPack;
