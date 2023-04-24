/**
 *
 * Reldens - RewardsSubscriber
 *
 */

const { Reward } = require('../reward');
const { RewardsConst } = require('../../constants');
const { Modifier, ModifierConst } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

class RewardsSubscriber
{

    constructor(props)
    {
        // @TODO - BETA - Handle undefined cases.
        this.teamsPlugin = props?.featuresManager?.featuresList?.teams;
        this.rewardsConfig = props.featuresManager?.config?.get('client/rewards/general', {}) ?? {};
    }

    async giveRewards(playerSchema, targetObject, eventsManager)
    {
        let eventDrop = {playerSchema, targetObject, continueEvent: true};
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
        let rewardTarget = this.determineRewardTarget(playerSchema);
        for(let winningReward of winningRewards){
            let giveRewardErrors = await this.giveReward(winningReward, rewardTarget, itemRewards);
            if(0 < giveRewardErrors.length){
                Logger.error(
                    'There was an error on the reward ID "'+winningReward.id+'".',
                    winningReward,
                    rewardTarget,
                    giveRewardErrors
                );
            }
        }
        // @TODO - BETA - Verify if we can update the unique reward if there was any errors.
        await this.updateUniqueRewards(winningRewards, targetObject.dataServer);
        if(0 === itemRewards.length){
            return;
        }
        await eventsManager.emit('reldens.afterGiveRewards', {itemRewards, playerSchema, targetObject, winningRewards});
    }

    determineRewardTarget(playerSchema)
    {
        if(!playerSchema.currentTeam){
            return playerSchema;
        }
        if(!this.teamsPlugin){
            Logger.error('TeamsPlugin undefined on RewardsSubscriber.');
            return false;
        }
        return playerSchema;
    }

    async giveReward(reward, playerSchema, itemRewards)
    {
        // @TODO - WIP.
        // give by record will give a single reward model all the options to the same player (exp, item, modifier):
        // let giveByRecord = this.config.get('rewards/general/giveByRecord');
        // - experience:
        //   1) split equally among the whole team.
        //   2) split proportionally according each team member level.
        // splitBetween = [ALL, PROPORTIONAL]:
        if(RewardsConst.SPLIT_EXPERIENCE.ALL === this.rewardsConfig['splitBetween']){
            // @TODO - WIP.
        }
        // - items (normal and drops):
        //   1) full random.
        //   2) if is drop, who pick up the item will keep it.
        // - modifiers:
        //   1) the same modifier will be applied to each team member.
        //   2) a modifier will be applied randomly to a single member.
        let errors = [];
        if(reward.isItemType()){
            let result = await this.applyItemReward(reward, playerSchema, itemRewards);
            if(!result.isSuccess){
                errors.push(result);
            }
        }
        if(reward.isModifierType()){
            let result = await this.applyModifierReward(reward, playerSchema);
            if(!result.isSuccess){
                errors.push(result);
            }
        }
        if(reward.hasExperienceSet()){
            let result = await this.applyExperienceReward(reward, playerSchema);
            if(!result.isSuccess){
                errors.push(result);
            }
        }
        return errors;
    }

    async applyItemReward(reward, playerSchema, itemRewards)
    {
        let winningItem = reward.item;
        if(!winningItem){
            return this.createRewardResult(false, 'The item with id ' + reward.itemId + ' was not found.');
        }
        if(reward.isDroppable()){
            itemRewards.push({winningItem, reward});
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

    async applyModifierReward(reward, player)
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

    async applyExperienceReward(reward, player)
    {
        await player.skillsServer.classPath.addExperience(reward.experience);
        return this.createRewardResult(true);
    }

    createRewardResult(isSuccess, message = '')
    {
        return { isSuccess, message };
    }

    async addItemToPlayerInventory(playerSchema, item, quantity)
    {
        let rewardItem = playerSchema.inventory.manager.createItemInstance(item.key, quantity);
        if(!rewardItem){
            Logger.error(`Couldn't create item instance with key ${item.key}`);
            return false;
        }
        return await playerSchema.inventory.manager.addItem(rewardItem);
    }

    getWinningRewards(rewards, usesRewardBag = false)
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

    async updateUniqueRewards(rewards, dataServer)
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
