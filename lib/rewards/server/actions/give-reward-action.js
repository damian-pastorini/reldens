/**
 *
 * Reldens - GiveRewardAction
 *
 * Executes the action of giving a reward item to a player by creating an item instance and adding it to their inventory.
 * The items manager creates one instance per unit of an item that is not single instance, so a created list is added
 * whole: when a unit can not be added (refused or thrown, a thrown add can leave the unit in the inventory) every unit
 * still in the inventory is removed, so the reward can be given again. When a unit can not be removed, the units left
 * count as given (logged as critical): execute() answers the units the player keeps from the give (0 when nothing was
 * given), so a caller that stores the given quantity (the event rewards) gives only the missing units later, and the
 * callers that can not store a quantity take any kept unit as given, so they never give the kept units twice.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class GiveRewardAction
{

    /**
     * @param {Object} playerSchema
     * @param {string} itemKey
     * @param {number} itemQuantity
     * @returns {Promise<number>}
     */
    async execute(playerSchema, itemKey, itemQuantity)
    {
        let itemsManager = playerSchema.inventory.manager;
        let createdItems = itemsManager.createItemInstance(itemKey, itemQuantity);
        if(!createdItems){
            Logger.error('Reward item instance could not be created.', itemKey);
            return 0;
        }
        if(!sc.isArray(createdItems)){
            return false === await itemsManager.addItem(createdItems) ? 0 : createdItems.qty;
        }
        for(let createdItem of createdItems){
            if(!await this.addUnit(itemsManager, createdItem)){
                Logger.error('Reward item unit could not be added, the added units are removed.', itemKey);
                return await this.removeAddedItems(itemsManager, createdItems, itemKey);
            }
        }
        return createdItems.length;
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
     * @returns {Promise<number>}
     */
    async removeAddedItems(itemsManager, createdItems, itemKey)
    {
        let unitsLeft = 0;
        for(let createdItem of createdItems){
            let itemId = createdItem.getInventoryId();
            if(sc.hasOwn(itemsManager.items, itemId) && !await this.removeUnit(itemsManager, itemId)){
                unitsLeft++;
            }
        }
        if(0 < unitsLeft){
            Logger.critical('Reward item units could not be removed, the units left count as given.', itemKey, unitsLeft);
        }
        return unitsLeft;
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
