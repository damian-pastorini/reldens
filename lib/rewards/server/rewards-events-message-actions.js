/**
 *
 * Reldens - RewardsEventsMessageActions
 *
 */

const { GiveRewardAction } = require('./actions/give-reward-action');
const { RewardsEventsProvider } = require('./rewards-events-provider');
const { RewardsEventsUpdater } = require('./rewards-events-updater');
const { RewardsEventsDataSender } = require('./rewards-events-data-sender');
const { RewardsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class RewardsEventsMessageActions
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        this.rewardsProvider = new RewardsEventsProvider(props);
        this.rewardsEventsUpdater = new RewardsEventsUpdater(props);
        this.rewardsEventsDataSender = new RewardsEventsDataSender();
        this.giveRewardAction = new GiveRewardAction();
    }

    async executeMessageActions(client, message, room, playerSchema)
    {
        let messageAction = sc.get(message, GameConst.ACTION_KEY, '');
        if(-1 === messageAction.indexOf(RewardsConst.PREFIX)){
            return false;
        }
        if(RewardsConst.ACTIONS.ACCEPT_REWARD === messageAction){
            return await this.processAcceptRewardMessage(playerSchema, message, room);
        }
        return false;
    }

    async processAcceptRewardMessage(playerSchema, message, room)
    {
        let rewardState = await this.rewardsProvider.fetchPlayerRewardStateWithRewardMappedData(
            playerSchema.player_id,
            message.id
        );
        if(!await this.updateRewardState(rewardState, playerSchema, message)){
            return false;
        }
        await this.rewardsEventsDataSender.sendAcceptedRewardUpdate(room, rewardState, playerSchema);
        return this.rewardsEventsDataSender.sendUpdates(
            room,
            playerSchema,
            await this.rewardsProvider.fetchPlayerActiveRewards(playerSchema.player_id)
        );
    }

    async updateRewardState(rewardState, playerSchema, message)
    {
        if(!rewardState){
            return true;
        }
        if(rewardState.mappedState.complete){
            return false;
        }
        let giveResult = await this.giveRewardItems(rewardState.reward, playerSchema);
        if(!giveResult){
            return true;
        }
        rewardState.mappedState.complete = true;
        return await this.rewardsEventsUpdater.updateStateById(
            rewardState.id,
            JSON.stringify(rewardState.mappedState),
            message.id,
            playerSchema.player_id
        );
    }

    async giveRewardItems(reward, playerSchema)
    {
        if(!sc.isObject(reward.eventData.items)){
            return true;
        }
        try {
            let itemsKeys = Object.keys(reward.eventData.items);
            for(let itemKey of itemsKeys){
                let quantity = reward.eventData.items[itemKey];
                await this.giveRewardAction.execute(playerSchema, itemKey, quantity);
            }
        } catch (error) {
            Logger.error('There was an error while giving reward items.', error);
            return false;
        }
        return true;
    }

}

module.exports.RewardsEventsMessageActions = RewardsEventsMessageActions;
