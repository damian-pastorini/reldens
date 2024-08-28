/**
 *
 * Reldens - GiveRewardAction
 *
 */

class GiveRewardAction
{

    async execute(playerSchema, itemKey, itemQuantity)
    {
        let rewardItem = playerSchema.inventory.manager.createItemInstance(itemKey, itemQuantity);
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

}

module.exports.GiveRewardAction = GiveRewardAction;
