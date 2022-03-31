/**
 *
 * Reldens - PlayerSubscriber
 *
 */

const { PlayerInventoryFactory } = require('../player-inventory-factory');
const { ItemsConst } = require('@reldens/items-system');

class PlayerSubscriber
{
    
    static async createPlayerInventory(client, authResult, currentPlayer, room, events, inventoryModelsManager)
    {
        // create player inventory:
        currentPlayer.inventory = await PlayerInventoryFactory.createInventory(
            client,
            currentPlayer,
            room,
            events,
            inventoryModelsManager
        );
        // @NOTE: here we send the groups data to generate the player interface instead of set them in the current
        // player inventory because for this specific implementation we don't need recursive groups lists in the
        // server for each player.
        let sendData = {
            act: ItemsConst.ACTION_SET_GROUPS,
            owner: currentPlayer.inventory.manager.getOwnerId(),
            groups: room.config.get('inventory/groups/groupBaseData')
        };
        room.send(client, sendData);
    }

}

module.exports.PlayerSubscriber = PlayerSubscriber;
