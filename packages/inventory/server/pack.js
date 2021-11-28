/**
 *
 * Reldens - Inventory Server Package
 *
 */

const { PackInterface } = require('../../features/pack-interface');
const { InventoryMessageActions } = require('./message-actions');
const { ItemsDataGenerator } = require('./items-data-generator');
const { PlayerInventoryFactory } = require('./player-inventory-factory');
const { GroupsDataGenerator } = require('./groups-data-generator');
const { ItemsConst } = require('@reldens/items-system');
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
        // @TODO - BETA - Refactor pack to extract the models and classes generation to the external packages.
        this.events.on('reldens.serverBeforeListen', async (event) => {
            this.inventoryModelsManager = new ModelsManager({dataServer: event.serverManager.dataServer});
        });
        this.events.on('reldens.serverReady', async (event) => {
            let configProcessor = event.serverManager.configManager.processor;
            if(!sc.hasOwn(configProcessor, 'inventory')){
                configProcessor.inventory = {};
            }
            await ItemsDataGenerator.appendItemsFullList(configProcessor, this.inventoryModelsManager);
            await GroupsDataGenerator.appendGroupsFullList(configProcessor, this.inventoryModelsManager);
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, room) => {
            // create player inventory:
            // currentPlayer.inventory = await this.createInventory(client, currentPlayer, room);
            currentPlayer.inventory = await PlayerInventoryFactory.createInventory(
                client,
                currentPlayer,
                room,
                this.events,
                this.inventoryModelsManager
            );
            // @NOTE: here we send the groups data to generate the player interface instead of set them in the current
            // player inventory because for this specific implementation we don't need recursive groups lists in the
            // server for each player.
            room.send(client, {
                act: ItemsConst.ACTION_SET_GROUPS,
                owner: currentPlayer.inventory.manager.getOwnerId(),
                groups: room.config.get('inventory/groups/groupBaseData')
            });
        });
        // when the client sent a message to any room it will be checked by all the global messages defined:
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.inventory = InventoryMessageActions;
        });
    }

}

module.exports.InventoryPack = InventoryPack;
