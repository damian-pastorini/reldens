const { sc, Logger } = require('@reldens/utils');

class RewardsSubscriber
{
    static async onBattleEnded(playerSchema, targetObject, events)
    {
        let rewards = sc.get(targetObject, 'rewards', false);

        let winningRewards = RewardsSubscriber.getWinningRewards(rewards, false);
        if (0 === winningRewards.length) {
            return false;
        }
        let itemRepository = targetObject.dataServer.getEntity('item');

        for (let winningReward of winningRewards) {
            let winningItem = await itemRepository.loadById(winningReward.item_id);
            let addItemsResult = await RewardsSubscriber.addItemToPlayerInventory(playerSchema, winningItem, winningReward.drop_quantity);
            if (!addItemsResult) {
                Logger.error('Couldn\'t add item to Player\'s Inventory');
                return false;
            }

            await events.emit('reldens.rewardDropped', {
                reward: winningReward,
                item_name: winningItem.label,
                player_id: playerSchema.player_id,
                room_id: targetObject.room_id,
                client: playerSchema?.skillsServer?.client?.client
            });
        }
        await RewardsSubscriber.updateUniqueRewards(winningRewards, targetObject.dataServer);
        return true;
    }

    static async addItemToPlayerInventory(playerSchema, item, quantity)
    {
        let rewardItemInstance = playerSchema.inventory.manager.createItemInstance(item.key);
        let rewardItems = Array(quantity).fill(rewardItemInstance);
        return await playerSchema.inventory.manager.addItems(rewardItems);
    }

    static getWinningRewards(rewards, usesRewardBag)
    {
        let rewardAwarded = [];
        if (!RewardsSubscriber.areValidRewards(rewards)) {
            return rewardAwarded;
        }
        if (usesRewardBag) {
            let rewardsBag = RewardsSubscriber.getRewardsBag(rewards);
            let reward = RewardsSubscriber.pickReward(rewardsBag);
            if (RewardsSubscriber.isValidReward(reward)) {
                rewardAwarded.push(reward);
            }
            return rewardAwarded;
        }
        for (let reward of rewards) {
            if (!RewardsSubscriber.isWinningReward(reward) || !RewardsSubscriber.isValidReward(reward)) {
                continue;
            }
            rewardAwarded.push(reward);
        }
        return rewardAwarded;
    }

    static isWinningReward(reward)
    {
        if (0 === reward.drop_rate) {
            return false;
        }
        return Math.floor(Math.random() * 100) <= reward.drop_rate;
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
        return 0 < (rewards?.length || 0);
    }

    static isValidReward(reward)
    {
        if (0 === reward.drop_quantity) {
            return false;
        }

        if (Boolean(reward?.is_unique) && Boolean(reward?.was_given)) {
            return false;
        }

        return true;
    }

    static async updateUniqueRewards(rewards, dataServer)
    {
        for (let reward of rewards) {
            if (Boolean(rewards?.is_unique)) {
                await dataServer.getEntity('rewards').updateById(rewards.id, { was_given: 1 });
            }
        }
    }
}

module.exports.RewardsSubscriber = RewardsSubscriber;
