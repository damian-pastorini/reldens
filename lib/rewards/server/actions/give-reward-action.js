/**
 *
 * Reldens - GiveRewardAction
 *
 * Executes the action of giving a reward item to a player by creating an item instance and adding it to their inventory.
 * The items manager creates one instance per unit of an item that is not single instance, so a created list is added
 * whole: when a unit can not be added (refused or thrown, a thrown add can leave the unit in the inventory) every unit
 * still in the inventory is removed and the give fails, so the reward can be given again. When a unit can not be
 * removed, the units left count as given (logged as critical), so a retry never gives those units twice.
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
        for(let createdItem of createdItems){
            if(!await this.addUnit(itemsManager, createdItem)){
                Logger.error('Reward item unit could not be added, the added units are removed.', itemKey);
                return !await this.removeAddedItems(itemsManager, createdItems, itemKey);
            }
        }
        return true;
    }

    /**
     * @param {Object} itemsManager
     * @param {Object} createdItem
     * @returns {Promise<boolean>}
     */
    async addUnit(itemsManager, createdItem)
    {
        let isAdded = false;
        try {
            isAdded = false !== await itemsManager.addItem(createdItem);
        } catch (error) {
            Logger.error('Reward item unit add error.', createdItem.getInventoryId(), error.message);
        }
        return isAdded;
    }

    /**
     * @param {Object} itemsManager
     * @param {Array<Object>} createdItems
     * @param {string} itemKey
     * @returns {Promise<boolean>}
     */
    async removeAddedItems(itemsManager, createdItems, itemKey)
    {
        let isRemoved = true;
        for(let createdItem of createdItems){
            let itemId = createdItem.getInventoryId();
            if(sc.hasOwn(itemsManager.items, itemId) && !await this.removeUnit(itemsManager, itemId)){
                isRemoved = false;
            }
        }
        if(!isRemoved){
            Logger.critical('Reward item units could not be removed, the units left count as given.', itemKey);
        }
        return isRemoved;
    }

    /**
     * @param {Object} itemsManager
     * @param {string} itemId
     * @returns {Promise<boolean>}
     */
    async removeUnit(itemsManager, itemId)
    {
        let isRemoved = false;
        try {
            isRemoved = await itemsManager.removeItem(itemId);
        } catch (error) {
            Logger.error('Added reward item unit remove error.', itemId, error.message);
        }
        return isRemoved;
    }

}

module.exports.GiveRewardAction = GiveRewardAction;
