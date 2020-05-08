/**
 *
 * Reldens - Inventory Server Package
 *
 */

const { ItemsServer } = require('@reldens/items-system');
const { EventsManager } = require('@reldens/utils');
const { PackInterface } = require('../../features/server/pack-interface');
const { InventoryMessageActions } = require('./message-actions');

class InventoryPack extends PackInterface
{

    setupPack()
    {
        EventsManager.on('reldens.serverStartBegin', () => {
            // @TODO: load items list.
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
        return inventoryServer;
    }

}

module.exports.InventoryPack = InventoryPack;
