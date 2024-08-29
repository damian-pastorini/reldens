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
        if(!sc.hasOwn(message, GameConst.ACTION_KEY)){
            return false;
        }
        if(-1 === message[GameConst.ACTION_KEY].indexOf(RewardsConst.PREFIX)){
            return false;
        }
        if(RewardsConst.ACTIONS.ACCEPT_REWARD === message[GameConst.ACTION_KEY]){
            let rewardState = await this.rewardsProvider.fetchPlayerRewardStateWithRewardMappedData(
                playerSchema.player_id,
                message.id
            );
            if(rewardState){
                if(rewardState.mappedState.complete){
                    return false;
                }
                let giveResult = await this.giveRewardItems(rewardState.reward, playerSchema);
                if(giveResult){
                    rewardState.mappedState.complete = true;
                    await this.rewardsEventsUpdater.updateStateById(
                        rewardState.id,
                        JSON.stringify(rewardState.mappedState),
                        message.id,
                        playerSchema.player_id
                    );
                }
            }
            return this.rewardsEventsDataSender.sendUpdates(
                room,
                playerSchema,
                await this.rewardsProvider.fetchPlayerActiveRewards(playerSchema.player_id)
            );
        }
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
