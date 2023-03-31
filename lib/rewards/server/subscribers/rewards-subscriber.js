/**
 *
 * Reldens - RewardsSubscriber
 *
 */

const { Reward } = require('../models/reward');
const { Modifier, ModifierConst } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

class RewardsSubscriber
{

    static async giveRewards(playerSchema, targetObject, eventsManager)
    {
        let eventDrop = {
            playerSchema,
            targetObject,
            continueEvent: true
        };
        await eventsManager.emit('reldens.beforeGiveRewards', eventDrop);
        if(!eventDrop.continueEvent){
            return;
        }
        let rewards = sc.get(targetObject, 'rewards', false);
        let winningRewards = this.getWinningRewards(rewards);
        if(0 === winningRewards.length){
            return;
        }
        let itemRewards = [];
        for(let winningReward of winningRewards){
            let giveRewardErrors = await this.giveReward(winningReward, playerSchema, async (item) => {
                itemRewards.push({item, reward: winningReward});
            });
            if(0 < giveRewardErrors.length){
                Logger.error(
                    'There was an error on the reward ' + winningReward.id +' given to the player ' + playerSchema.id,
                    winningReward,
                    giveRewardErrors
                );
            }
        }
        await this.updateUniqueRewards(winningRewards, targetObject.dataServer);
        if(0 === itemRewards.length){
            return;
        }
        await eventsManager.emit('reldens.afterGiveRewards', {
            itemRewards,
            playerSchema,
            targetObject,
            winningRewards
        });
    }

    static async giveReward(reward, playerSchema, callbackFn)
    {
        let results = [];
        if(reward.isItemType()){
            let result = await this.applyItemReward(reward, playerSchema, callbackFn);
            if(!result.isSuccess){
                results.push(result);
            }
        }
        if(reward.isModifierType()){
            let result = await this.applyModifierReward(reward, playerSchema);
            if(!result.isSuccess){
                results.push(result);
            }
        }
        if(reward.hasExperienceSet()){
            let result = await this.applyExperienceReward(reward, playerSchema);
            if(!result.isSuccess){
                results.push(result);
            }
        }
        return results;
    }

    static async applyItemReward(reward, playerSchema, callbackFn)
    {
        let winningItem = reward.item;
        if(!winningItem){
            return this.createRewardResult(false, 'The item with id ' + reward.itemId + ' was not found.');
        }
        if(reward.isDroppable()){
            callbackFn(winningItem);
            return this.createRewardResult(true);
        }
        let addItemsResult = await this.addItemToPlayerInventory(playerSchema, winningItem, reward.dropQuantity);
        if(!addItemsResult){
            return this.createRewardResult(
                false,
                'Could not add item to Players Inventory - Reward ' + reward.id + ' - Item Id = ' + reward.itemId
            );
        }
        return this.createRewardResult(true);
    }

    static async applyModifierReward(reward, player)
    {
        let rewardModifierModel = reward.modifier;
        if(!rewardModifierModel){
            return this.createRewardResult(false, 'The modifier with id ' + reward.modifierId + ' was not found.');
        }
        let modifier = new Modifier(rewardModifierModel);
        modifier.apply(player);
        if(ModifierConst.MOD_APPLIED !== modifier.state){
            return this.createRewardResult(
                false,
                'Could not add modifier to Player - Reward ' + reward.id + ' - Modifier Id = ' + reward.modifierId
            );
        }
        return this.createRewardResult(true);
    }

    static async applyExperienceReward(reward, player)
    {
        await player.skillsServer.classPath.addExperience(reward.experience);
        return this.createRewardResult(true);
    }

    static createRewardResult(isSuccess, message = '')
    {
        return { isSuccess, message };
    }

    static async addItemToPlayerInventory(playerSchema, item, quantity)
    {
        let rewardItem = playerSchema.inventory.manager.createItemInstance(item.key, quantity);
        if(!rewardItem){
            Logger.error(`Couldn't create item instance with key ${item.key}`);
            return false;
        }
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

    static getWinningRewards(rewards, usesRewardBag = false)
    {
        let rewardAwarded = [];
        if(!Reward.areValidRewards(rewards)){
            return rewardAwarded;
        }
        if(usesRewardBag){
            let rewardsBag = Reward.getRewardsBag(rewards);
            let reward = rewardsBag[Math.floor(Math.random() * rewardsBag.length)];
            if(reward.isValidReward()){
                rewardAwarded.push(reward);
            }
            return rewardAwarded;
        }
        for(let reward of rewards){
            if(!reward.isWinningReward() || !reward.isValidReward()){
                continue;
            }
            rewardAwarded.push(reward);
        }
        return rewardAwarded;
    }

    static async updateUniqueRewards(rewards, dataServer)
    {
        let rewardsRepository = dataServer.getEntity('rewards');
        for(let reward of rewards){
            if(reward.isUnique && !reward.was_given){
                await rewardsRepository.updateById(reward.id, { was_given: 1 });
            }
        }
    }

}

module.exports.RewardsSubscriber = RewardsSubscriber;
