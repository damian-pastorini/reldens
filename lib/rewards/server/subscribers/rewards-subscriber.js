const { sc, Logger } = require('@reldens/utils');
const { Modifier } = require('@reldens/modifiers');

class RewardsSubscriber
{
    static async giveRewards(playerSchema, targetObject, eventsManager)
    {
        let rewards = sc.get(targetObject, 'rewards', false);

        let winningRewards = this.getWinningRewards(rewards);
        if (0 === winningRewards.length) {
            return false;
        }

        let repositories = this.getRepositories(targetObject);

        let itemRewards = [];
        for (let winningReward of winningRewards) {
            let giveRewardResult = await this.giveReward(winningReward, repositories, playerSchema, async (item) => {
                itemRewards.push({
                    item,
                    reward: winningReward
                });
            });
            if (!giveRewardResult) {
                Logger.error('An error occurred while trying to give reward with id = ' + winningReward.id);
                continue;
            }
            if (this.isItemType(winningReward)) {

            }
        }

        await eventsManager.emit('reldens.itemsRewardsDropped', {
            itemRewards,
            player_id: playerSchema.player_id,
            target_object: targetObject,
            client: playerSchema?.skillsServer?.client?.client
        });
        await this.updateUniqueRewards(winningRewards, targetObject.dataServer);
        return true;
    }

    static async giveReward(reward, repositories, playerSchema, callbackFn)
    {
        let result;
        if (this.isItemType(reward)) {
            result = await this.applyItemReward(repositories.itemRepository, reward, playerSchema, callbackFn);
        }

        if (this.isModifierType(reward)) {
            result = await this.applyModifierReward(repositories.rewardsModifiersRepository, reward, playerSchema);
        }

        if (this.hasExperienceSet(reward)) {
            result = await this.applyExperienceReward(reward, playerSchema);
        }
        return result;
    }

    static async applyItemReward(repository, reward, playerSchema, callbackFn)
    {
        try {
            let winningItem = await repository.loadById(reward.item_id);
            let addItemsResult = await this.addItemToPlayerInventory(playerSchema, winningItem, reward.drop_quantity);
            if (addItemsResult) {
                callbackFn(winningItem);
            }
            return addItemsResult;
        } catch (e) {
            Logger.error('Could not add item to Players Inventory - Reward ' +
                reward.id + ' - Item Id = ' + reward.item_id);
            return false;
        }
    }

    static async applyModifierReward(repository, reward, player)
    {
        try {
            let rewardModifierModel = await repository.loadById(reward.modifier_id);
            let modifier = new Modifier(rewardModifierModel);
            modifier.apply(player);
        } catch (e) {
            Logger.error('Could not add modifier to Player - Reward ' +
                reward.id + ' - Modifier Id = ' + reward.modifier_id, e);
            return false;
        }
        return true;
    }

    static async applyExperienceReward(reward, player)
    {
        try {
            await player.skillsServer.classPath.addExperience(reward.experience);
        } catch (e) {
            Logger.error('Could not add experience to Player - Reward ' +
                reward.id + ' - exp amount = ' + reward.experience, e);
            return false;
        }
        return true;
    }

    static async addItemToPlayerInventory(playerSchema, item, quantity)
    {
        let rewardItem = playerSchema.inventory.manager.createItemInstance(item.key, quantity);
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

    static getWinningRewards(rewards, usesRewardBag = false)
    {
        let rewardAwarded = [];
        if (!this.areValidRewards(rewards)) {
            return rewardAwarded;
        }
        if (usesRewardBag) {
            let rewardsBag = this.getRewardsBag(rewards);
            let reward = this.pickReward(rewardsBag);
            if (this.isValidReward(reward)) {
                rewardAwarded.push(reward);
            }
            return rewardAwarded;
        }
        for (let reward of rewards) {
            if (!this.isWinningReward(reward) || !this.isValidReward(reward)) {
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

        if (this.isUnique(reward) && Boolean(reward?.was_given)) {
            return false;
        }

        if (!this.isItemType(reward) && !this.isModifierType(reward) && !this.hasExperienceSet(reward)) {
            return false;
        }

        if (!this.hasAnimationData(reward)) {
            Logger.info(`Reward with id (${reward.id}) does not have an animation data.`);
            return false;
        }

        return true;
    }

    static async updateUniqueRewards(rewards, dataServer)
    {
        let rewardsRepository = dataServer.getEntity('rewards');
        for (let reward of rewards) {
            if (this.isUnique(reward)) {
                await rewardsRepository.updateById(reward.id, { was_given: 1 });
            }
        }
    }

    static isUnique(reward)
    {
        return Boolean(reward?.is_unique);
    }

    static isItemType(reward)
    {
        return null !== reward.item_id;
    }

    static isModifierType(reward)
    {
        return null !== reward.modifier_id;
    }

    static hasExperienceSet(reward) {
        return 0 <= reward.experience;
    }

    static getRepositories(targetObject)
    {
        return {
            itemRepository: targetObject.dataServer.getEntity('item'),
            rewardsModifiersRepository: targetObject.dataServer.getEntity('rewardsModifiers')
        };
    }

    static hasAnimationData(reward)
    {
        return sc.get(reward, 'objects_items_rewards_animations', false);
    }
}

module.exports.RewardsSubscriber = RewardsSubscriber;
