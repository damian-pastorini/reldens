/**
 *
 * Reldens - Inventory Server Package
 *
 */

const { ItemsServer, ItemBase } = require('@reldens/items-system');
const { ModelsManager } = require('@reldens/items-system/lib/server/storage/models-manager');
const { EventsManager } = require('@reldens/utils');
const { PackInterface } = require('../../features/server/pack-interface');
const { InventoryMessageActions } = require('./message-actions');

class InventoryPack extends PackInterface
{

    setupPack()
    {
        EventsManager.on('reldens.serverReady', async (event) => {
            // use the inventory models manager to get the items list loaded:
            let itemsModelsManager = new ModelsManager();
            let itemsModelsList = await itemsModelsManager.models.item.query();
            if(itemsModelsList.length){
                let itemsList = {};
                let configProcessor = event.serverManager.configManager.processor;
                let inventoryClasses = configProcessor.get('server/customClasses/inventory');
                for(let itemModel of itemsModelsList){
                    let itemClass = ItemBase;
                    if({}.hasOwnProperty.call(inventoryClasses, itemModel.key)){
                        itemClass = inventoryClasses[itemModel.key];
                    }
                    itemsList[itemModel.key] = {class: itemClass, data: itemModel};
                }
                configProcessor.inventory = {items: {itemsModels: itemsModelsList, itemsList}};
            }
        });
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, room) => {
            currentPlayer.inventory = await this.createInventory(client, currentPlayer, room);
        });
        // when the client sent a message to any room it will be checked by all the global messages defined:
        EventsManager.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.inventory = InventoryMessageActions;
        });
    }

    async createInventory(client, currentPlayer, room)
    {
        // @TODO: improve asap (remove all methods defined here).
        // wrap the client:
        let clientWrapper = {
            send: (data) => {
                room.send(client, data);
            }
        };
        // @TODO: implement currentPlayer.persistData() (see onExecutedItem(item) in ModelsManager class), and test.
        // eslint-disable-next-line no-unused-vars
        currentPlayer.persistData = async (params) => {
            // persist data in player:
            await currentPlayer.savePlayerState(currentPlayer.sessionId);
            await currentPlayer.savePlayerStats(currentPlayer);
        };
        let serverProps = {
            owner: currentPlayer,
            client: clientWrapper,
            persistence: true,
            ownerIdProperty: 'player_id'
        };
        let inventoryClasses = room.config.get('server/customClasses/inventory');
        if(inventoryClasses){
            serverProps.itemClasses = inventoryClasses;
        }
        let inventoryServer = new ItemsServer(serverProps);
        // for now I will load all the items here and then create instances for later assign them to their owner:
        await inventoryServer.dataServer.loadOwnerItems();
        inventoryServer.createItemInstance = (key, qty) => {
            let result = false;
            let itemData = room.config.get('inventory/items/itemsList/'+key);
            if(itemData){
                let itemProps = Object.assign({}, itemData['data'], {
                    manager: inventoryServer.manager,
                    item_id: itemData['data'].id,
                    qty: (typeof qty !== 'undefined') ? qty : 1
                });
                result = new itemData['class'](itemProps);
            }
            return result;
        };
        return inventoryServer;
    }

}

module.exports.InventoryPack = InventoryPack;
