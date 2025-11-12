/**
 *
 * Reldens - PlayerSubscriber
 *
 */

const { ClientWrapper } = require('../../../game/server/client-wrapper');
const { StorageObserver } = require('../storage-observer');
const { ItemsConst, ItemsServer} = require('@reldens/items-system');

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
            itemClasses: room.config.getWithoutLogs('server/customClasses/inventory/items', {}),
            groupClasses: room.config.getWithoutLogs('server/customClasses/inventory/groups', {}),
            itemsModelData: room.config.inventory.items
        };
        // @TODO - BETA - Add new event here for the server properties.
        let inventoryServer = new ItemsServer(serverProps);
        inventoryServer.dataServer = new StorageObserver(inventoryServer.manager, modelsManager);
        inventoryServer.dataServer.listenEvents();
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
            groups: room.config.getWithoutLogs('inventory/groups/groupBaseData', {})
        };
        // @TODO - BETA - Add new event here for the sendData.
        client.send('*', sendData);
    }

}

module.exports.PlayerSubscriber = PlayerSubscriber;
