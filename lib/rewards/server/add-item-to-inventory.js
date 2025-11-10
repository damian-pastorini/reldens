/**
 *
 * Reldens - AddItemToInventory
 *
 */

class AddItemToInventory
{

    async byItemIdOnPlayer(itemId, playerSchema)
    {
        let itemModel = await playerSchema.skillsServer.dataServer.getEntity('itemsItem').loadById(itemId);
        let itemInstance = playerSchema.inventory.manager.createItemInstance(itemModel.key);
        return await playerSchema.inventory.manager.addItem(itemInstance);
    }

}

module.exports.AddItemToInventory = new AddItemToInventory();
