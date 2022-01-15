/**
 *
 * Reldens - PlayerInventoryFactory
 *
 */

const { ClientWrapper } = require('../../game/server/client-wrapper');
const { ItemsServer } = require('@reldens/items-system');

class PlayerInventoryFactory
{

    static async createInventory(client, playerSchema, room, events, inventoryModelsManager)
    {
        // wrap the client:
        let clientWrapper = new ClientWrapper(client, room);
        let serverProps = {
            owner: playerSchema,
            client: clientWrapper,
            persistence: true,
            ownerIdProperty: 'player_id',
            eventsManager: events,
            modelsManager: inventoryModelsManager
        };
        let inventoryClasses = room.config.get('server/customClasses/inventory/items');
        if(inventoryClasses){
            serverProps.itemClasses = inventoryClasses;
        }
        let groupClasses = room.config.get('server/customClasses/inventory/groups');
        if(groupClasses){
            serverProps.groupClasses = groupClasses;
        }
        let inventoryServer = new ItemsServer(serverProps);
        // broadcast player sessionId to share animations:
        inventoryServer.client.sendTargetProps.broadcast.push('sessionId');
        // for now, I will load all the items here and then create instances for later assign them to their owner:
        await inventoryServer.dataServer.loadOwnerItems();
        inventoryServer.createItemInstance = (key, qty) => {
            let itemData = room.config.get('inventory/items/itemsList/'+key);
            if(false === itemData){
                return false;
            }
            if(itemData['data'].modifiers){
                for(let i of Object.keys(itemData['data'].modifiers)){
                    itemData['data'].modifiers[i].target = playerSchema;
                }
            }
            let itemProps = Object.assign({}, itemData['data'], {
                manager: inventoryServer.manager,
                item_id: itemData['data'].id,
                qty: (typeof qty !== 'undefined') ? qty : 1
            });
            return new itemData['class'](itemProps);
        };
        return inventoryServer;
    }

}

module.exports.PlayerInventoryFactory = PlayerInventoryFactory;
