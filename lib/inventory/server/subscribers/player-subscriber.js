/**
 *
 * Reldens - PlayerSubscriber
 *
 */

const { ItemsConst, ItemsServer} = require('@reldens/items-system');
const { ClientWrapper } = require('../../../game/server/client-wrapper');

class PlayerSubscriber
{
    
    static async createPlayerInventory(client, currentPlayer, room, events, modelsManager)
    {
        let serverProps = {
            owner: currentPlayer,
            client: new ClientWrapper({client, room}),
            persistence: true,
            ownerIdProperty: 'player_id',
            eventsManager: events,
            modelsManager: modelsManager,
            itemClasses: room.config.get('server/customClasses/inventory/items', true) || {},
            groupClasses: room.config.get('server/customClasses/inventory/groups', true) || {},
            itemsModelData: room.config.inventory.items
        };
        // @TODO - BETA - Add new event here for the server properties.
        let inventoryServer = new ItemsServer(serverProps);
        // broadcast player sessionId to share animations:
        inventoryServer.client.sendTargetProps.broadcast.push('sessionId');
        // load all the items here and then create instances for later use:
        await inventoryServer.dataServer.loadOwnerItems();
        // create player inventory:
        currentPlayer.inventory = inventoryServer;
        // @NOTE: here we send the groups data to generate the player interface instead of set them in the current
        // player inventory because for this specific implementation we don't need recursive groups lists in the
        // server for each player.
        let sendData = {
            act: ItemsConst.ACTION_SET_GROUPS,
            owner: currentPlayer.inventory.manager.getOwnerId(),
            groups: room.config.get('inventory/groups/groupBaseData')
        };
        // @TODO - BETA - Add new event here for the sendData.
        client.send('*', sendData);
    }

}

module.exports.PlayerSubscriber = PlayerSubscriber;
