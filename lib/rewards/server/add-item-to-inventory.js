/**
 *
 * Reldens - AddItemToInventory
 *
 * Helper class for adding items to player inventories, exported as a singleton.
 *
 */

class AddItemToInventory
{

    /**
     * @param {Object} itemModel
     * @param {Object} playerSchema
     * @returns {Promise<Object>}
     */
    async byItemModelOnPlayer(itemModel, playerSchema)
    {
        let itemInstance = playerSchema.inventory.manager.createItemInstance(itemModel.key);
        return await playerSchema.inventory.manager.addItem(itemInstance);
    }

}

module.exports.AddItemToInventory = new AddItemToInventory();
