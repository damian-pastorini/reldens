/**
 *
 * Reldens - GiveRewardAction
 *
 * Executes the action of giving a reward item to a player by creating an item instance and adding it to their inventory.
 * The items manager creates one instance per unit of an item that is not single instance, so a created list is added
 * whole: when a unit can not be added the units already added are removed, so a failed give never leaves a part of the
 * reward that the reward would give again.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class GiveRewardAction
{

    /**
     * @param {Object} playerSchema
     * @param {string} itemKey
     * @param {number} itemQuantity
     * @returns {Promise<Object|boolean>}
     */
    async execute(playerSchema, itemKey, itemQuantity)
    {
        let itemsManager = playerSchema.inventory.manager;
        let createdItems = itemsManager.createItemInstance(itemKey, itemQuantity);
        if(!createdItems){
            Logger.error('Reward item instance could not be created.', itemKey);
            return false;
        }
        if(!sc.isArray(createdItems)){
            return await itemsManager.addItem(createdItems);
        }
        let addedItemsIds = [];
        for(let createdItem of createdItems){
            if(!await itemsManager.addItem(createdItem)){
                Logger.error('Reward item unit could not be added, the added units are removed.', itemKey);
                await this.removeAddedItems(itemsManager, addedItemsIds);
                return false;
            }
            addedItemsIds.push(createdItem.getInventoryId());
        }
        return true;
    }

    /**
     * @param {Object} itemsManager
     * @param {Array<string>} addedItemsIds
     * @returns {Promise<boolean>}
     */
    async removeAddedItems(itemsManager, addedItemsIds)
    {
        let isRemoved = true;
        for(let addedItemId of addedItemsIds){
            if(!await itemsManager.removeItem(addedItemId)){
                Logger.error('Added reward item unit could not be removed.', addedItemId);
                isRemoved = false;
            }
        }
        return isRemoved;
    }

}

module.exports.GiveRewardAction = GiveRewardAction;
