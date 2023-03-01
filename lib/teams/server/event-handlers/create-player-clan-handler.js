/**
 *
 * Reldens - CreatePlayerClanHandler
 *
 */

class CreatePlayerClanHandler
{
    
    static async enrichPlayerWithClan(client, playerSchema, room, events, modelsManager)
    {
        /*
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
        client.send('*', sendData);
        */
    }

}

module.exports.CreatePlayerClanHandler = CreatePlayerClanHandler;
