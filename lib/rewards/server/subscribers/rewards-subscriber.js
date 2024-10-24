/**
 *
 * Reldens - RewardsSubscriber
 *
 */

const { TargetDeterminer } = require('../target-determiner');
const { Reward } = require('../reward');
const { RewardsConst } = require('../../constants');
const { Modifier, ModifierConst } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

class RewardsSubscriber
{

    constructor(props)
    {
        // @TODO - BETA - Handle undefined cases.
        this.teamsPlugin = props?.featuresManager?.featuresList?.teams.package;
        this.rewardsConfig = props.featuresManager?.config?.getWithoutLogs('client/rewards/general', {}) ?? {};
        this.splitExperience = sc.get(this.rewardsConfig, 'splitExperience', 0);
        this.splitModifier = sc.get(this.rewardsConfig, 'splitModifier', 0);
        this.targetDeterminer = new TargetDeterminer(this.teamsPlugin);
    }

    async giveRewards(playerSchema, targetObject, eventsManager)
    {
        if(!targetObject){
            return;
        }
        let eventDrop = {playerSchema, targetObject, continueEvent: true};
        await eventsManager.emit('reldens.beforeGiveRewards', eventDrop);
        if(!eventDrop.continueEvent){
            return;
        }
        let rewards = sc.get(targetObject, 'rewards', false);
        let winningRewards = this.getWinningRewards(rewards);
        // Logger.debug('Player won rewards.', rewards, {playerId: playerSchema.player_id, objectId: targetObject.id});
        if(0 === winningRewards.length){
            return;
        }
        let itemRewards = [];
        for(let winningReward of winningRewards){
            let giveRewardErrors = await this.giveReward(winningReward, playerSchema, itemRewards);
            if(0 < giveRewardErrors.length){
                Logger.error(
                    'There was an error on the reward ID "'+winningReward.id+'".',
                    winningReward,
                    playerSchema,
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

    async giveReward(reward, playerSchema, itemRewards)
    {
        // @TODO - BETA - Make optional give full records or partial ones.
        // give by record will give a single reward model all the options to the same player (exp, item, modifier):
        // let giveByRecord = this.config.get('rewards/general/giveByRecord');
        let rewardTargets = this.targetDeterminer.forReward(playerSchema);
        let errors = [];
        if(reward.isItemType()){
            let result = await this.applyItemReward(reward, rewardTargets, itemRewards);
            if(!result.isSuccess){
                errors.push(result);
            }
        }
        if(reward.isModifierType()){
            let result = await this.applyModifierReward(reward, rewardTargets);
            if(!result.isSuccess){
                errors.push(result);
            }
        }
        if(reward.hasExperienceSet()){
            let result = await this.applyExperienceReward(reward, rewardTargets);
            if(!result.isSuccess){
                errors.push(result);
            }
        }
        return errors;
    }

    async applyItemReward(reward, rewardTargets, itemRewards)
    {
        if(!reward.item){
            return this.createRewardResult(false, 'The item with id "'+reward.itemId+'" was not found.');
        }
        let playersKeys = Object.keys(rewardTargets);
        let randomIndex = sc.randomInteger(0, (playersKeys.length -1));
        let randomTarget = rewardTargets[playersKeys[randomIndex]];
        if(reward.isDroppable()){
            itemRewards.push(reward);
            return this.createRewardResult(true);
        }
        let addItemsResult = await this.addItemToPlayerInventory(randomTarget, reward.item, reward.dropQuantity);
        if(!addItemsResult){
            return this.createRewardResult(
                false,
                'Could not add item to Players Inventory - Reward ' + reward.id + ' - Item Id = ' + reward.itemId
            );
        }
        return this.createRewardResult(true);
    }

    async applyModifierReward(reward, rewardTargets)
    {
        let rewardModifierModel = reward.modifier;
        if(!rewardModifierModel){
            return this.createRewardResult(false, 'The modifier with id ' + reward.modifierId + ' was not found.');
        }
        let playersKeys = Object.keys(rewardTargets);
        let randomIndex = sc.randomInteger(0, playersKeys.length);
        let randomTarget = rewardTargets[randomIndex];
        let configuredTargets = RewardsConst.SPLIT_MODIFIER.ALL === this.splitModifier
            ? rewardTargets
            : {[randomTarget.player_id]: randomTarget};
        for(let i of Object.keys(configuredTargets)){
            let modifier = new Modifier(rewardModifierModel);
            modifier.apply(configuredTargets[i]);
            if(ModifierConst.MOD_APPLIED !== modifier.state){
                return this.createRewardResult(
                    false,
                    'Could not add modifier to Player - Reward ' + reward.id + ' - Modifier Id = ' + reward.modifierId
                );
            }
        }
        return this.createRewardResult(true);
    }

    async applyExperienceReward(reward, rewardTargets)
    {
        let playersKeys = Object.keys(rewardTargets);
        if(RewardsConst.SPLIT_EXPERIENCE.ALL === this.splitExperience){
            for(let i of playersKeys){
                let experiencePerPlayer = Number(reward.experience) / Number(playersKeys.length);
                let rewardTargetClassPath = rewardTargets[i].skillsServer.classPath;
                await rewardTargetClassPath.addExperience(experiencePerPlayer);
            }
        }
        if(RewardsConst.SPLIT_EXPERIENCE.PROPORTIONAL_BY_LEVEL === this.splitExperience){
            let levelsTotal = this.targetsLevelsTotal(playersKeys, rewardTargets);
            for(let i of playersKeys){
                let rewardTargetClassPath = rewardTargets[i].skillsServer.classPath;
                let playerLevelProportion = (rewardTargetClassPath.currentLevel * 100) / levelsTotal;
                let experiencePerPlayer = (playerLevelProportion * Number(reward.experience)) / 100 ;
                await rewardTargetClassPath.addExperience(experiencePerPlayer);
            }
        }
        return this.createRewardResult(true);
    }

    targetsLevelsTotal(playersKeys, rewardTargets)
    {
        let levelsTotal = 0;
        for(let i of playersKeys){
            levelsTotal += Number(rewardTargets[i].skillsServer.classPath.currentLevel);
        }
        return levelsTotal;
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
