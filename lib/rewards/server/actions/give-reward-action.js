/**
 *
 * Reldens - GiveRewardAction
 *
 * Executes the action of giving a reward item to a player by creating an item instance and adding it to their inventory.
 *
 */

class GiveRewardAction
{

    /**
     * @param {Object} playerSchema
     * @param {string} itemKey
     * @param {number} itemQuantity
     * @returns {Promise<Object>}
     */
    async execute(playerSchema, itemKey, itemQuantity)
    {
        let rewardItem = playerSchema.inventory.manager.createItemInstance(itemKey, itemQuantity);
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

}

module.exports.GiveRewardAction = GiveRewardAction;
