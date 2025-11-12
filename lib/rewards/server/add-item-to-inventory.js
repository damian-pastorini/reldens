/**
 *
 * Reldens - AddItemToInventory
 *
 */

class AddItemToInventory
{

    async byItemModelOnPlayer(itemModel, playerSchema)
    {
        let itemInstance = playerSchema.inventory.manager.createItemInstance(itemModel.key);
        return await playerSchema.inventory.manager.addItem(itemInstance);
    }

}

module.exports.AddItemToInventory = new AddItemToInventory();
