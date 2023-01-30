const { sc, Logger } = require('@reldens/utils');

class RewardsSubscriber
{
    static async onBattleEnded(playerSchema, targetObject)
    {
        let rewards = sc.get(targetObject, 'rewards', false);
        if (!RewardsSubscriber.areValidRewards(rewards)) {
            return false;
        }

        let rewardModel = RewardsSubscriber.getRewardToDrop(rewards);
        if (!RewardsSubscriber.isValidReward(rewardModel)) {
            return false;
        }

        let rewardItem = await targetObject.dataServer.getEntity('item').loadById(rewardModel.item_id);
        let addItemsResult = await RewardsSubscriber.addItemToPlayerInventory(playerSchema, rewardItem, rewardModel.drop_quantity);
        if (!addItemsResult) {
            Logger.error('Couldn\'t add item to Player\'s Inventory');
            return false;
        }

        // TODO: SEND MESSAGE TO PLAYER'S CHAT;
        await RewardsSubscriber.updateRewardModel(rewardModel, targetObject.dataServer);
    }

    static async addItemToPlayerInventory(playerSchema, item, quantity)
    {
        let rewardItemInstance = playerSchema.inventory.manager.createItemInstance(item.key);
        let rewardItems = Array(quantity).fill(rewardItemInstance);
        return await playerSchema.inventory.manager.addItems(rewardItems);
    }

    static getRewardToDrop(rewards)
    {
        let rewardsBag = RewardsSubscriber.getRewardsBag(rewards);
        return RewardsSubscriber.pickReward(rewardsBag);
    }

    static getRewardsBag(rewards)
    {
        let itemRangeArray = [];

        for (let reward of rewards) {
            let itemRangeCount = itemRangeArray.length;
            for (let i = 0; i < reward.drop_rate; i++) {
                itemRangeArray[itemRangeCount + i] = reward;
            }
        }

        return itemRangeArray;
    }

    static pickReward(rewardsBag)
    {
        return rewardsBag[Math.floor(Math.random() * rewardsBag.length)];
    }

    static areValidRewards(rewards)
    {
        if (false === rewards) {
            return false;
        }

        if (!sc.isArray(rewards)) {
            return false;
        }

        if (0 === rewards.length) {
            return false;
        }

        return true;
    }

    static isValidReward(reward)
    {
        if (0 === reward.drop_quantity) {
            return false;
        }

        if (1 === reward.is_unique && 1 === reward.was_given) {
            return false;
        }

        return true;
    }

    static async updateRewardModel(rewardModel, dataServer)
    {
        if (1 === rewardModel.is_unique) {
            await dataServer.getEntity('rewards').updateById(rewardModel.id, { was_given: 1 });
        }
    }
}

module.exports.RewardsSubscriber = RewardsSubscriber;
