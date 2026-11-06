/**
 *
 * Reldens - RewardsEventsMessageActions
 *
 * Handles client messages for accepting reward events, processing reward state updates, and distributing reward items.
 * Only a ready and not completed reward gives its items, a failed items give keeps the reward claimable and is never
 * sent as accepted, and the accept messages of a player run one after the other, so overlapping messages read the state
 * saved by the previous one and give the reward once. Every given item is stored in the reward state as soon as it is
 * given, so a claim that failed after some items gives only the missing ones when it is claimed again.
 *
 */

const { GiveRewardAction } = require('./actions/give-reward-action');
const { RewardsEventsProvider } = require('./rewards-events-provider');
const { RewardsEventsUpdater } = require('./rewards-events-updater');
const { RewardsEventsDataSender } = require('./rewards-events-data-sender');
const { KeyedOperationsLock } = require('../../game/server/memory/keyed-operations-lock');
const { RewardsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class RewardsEventsMessageActions
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        /** @type {RewardsEventsProvider} */
        this.rewardsProvider = new RewardsEventsProvider(props);
        /** @type {RewardsEventsUpdater} */
        this.rewardsEventsUpdater = new RewardsEventsUpdater(props);
        /** @type {RewardsEventsDataSender} */
        this.rewardsEventsDataSender = new RewardsEventsDataSender();
        /** @type {GiveRewardAction} */
        this.giveRewardAction = new GiveRewardAction();
        /** @type {KeyedOperationsLock} */
        this.acceptMessagesLock = new KeyedOperationsLock();
    }

    /**
     * @param {Object} client
     * @param {Object} message
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async executeMessageActions(client, message, room, playerSchema)
    {
        let messageAction = sc.get(message, GameConst.ACTION_KEY, '');
        if(-1 === messageAction.indexOf(RewardsConst.PREFIX)){
            return false;
        }
        if(RewardsConst.ACTIONS.ACCEPT_REWARD === messageAction){
            return await this.acceptMessagesLock.queue(
                playerSchema.player_id,
                () => this.processAcceptRewardMessage(playerSchema, message, room).catch((error) => {
                    Logger.error('Accept reward error.', playerSchema.player_id, message.id, error.message);
                    return false;
                })
            );
        }
        return false;
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} message
     * @param {Object} room
     * @returns {Promise<boolean>}
     */
    async processAcceptRewardMessage(playerSchema, message, room)
    {
        let rewardState = await this.rewardsProvider.fetchPlayerRewardStateWithRewardMappedData(
            playerSchema.player_id,
            message.id
        );
        if(!await this.updateRewardState(rewardState, playerSchema, message)){
            return false;
        }
        this.rewardsEventsDataSender.sendAcceptedRewardUpdate(room, rewardState, playerSchema);
        return this.rewardsEventsDataSender.sendUpdates(
            room,
            playerSchema,
            await this.rewardsProvider.fetchPlayerActiveRewards(playerSchema.player_id)
        );
    }

    /**
     * @param {Object} rewardState
     * @param {Object} playerSchema
     * @param {Object} message
     * @returns {Promise<boolean>}
     */
    async updateRewardState(rewardState, playerSchema, message)
    {
        if(!rewardState){
            return true;
        }
        if(!rewardState.mappedState.ready){
            return false;
        }
        if(rewardState.mappedState.complete){
            return false;
        }
        if(!await this.giveRewardItems(rewardState, playerSchema, message)){
            return false;
        }
        rewardState.mappedState.complete = true;
        delete rewardState.mappedState.givenItems;
        return await this.saveRewardState(rewardState, playerSchema, message);
    }

    /**
     * @param {Object} rewardState
     * @param {Object} playerSchema
     * @param {Object} message
     * @returns {Promise<Object|boolean>}
     */
    async saveRewardState(rewardState, playerSchema, message)
    {
        return await this.rewardsEventsUpdater.updateStateById(
            rewardState.id,
            sc.toJsonString(rewardState.mappedState),
            message.id,
            playerSchema.player_id
        );
    }

    /**
     * @param {Object} rewardState
     * @param {Object} playerSchema
     * @param {Object} message
     * @returns {Promise<boolean>}
     */
    async giveRewardItems(rewardState, playerSchema, message)
    {
        let rewardItems = rewardState.reward.eventData.items;
        if(!sc.isObject(rewardItems)){
            return true;
        }
        let givenItems = sc.get(rewardState.mappedState, 'givenItems', {});
        for(let itemKey of Object.keys(rewardItems)){
            if(givenItems[itemKey]){
                continue;
            }
            if(!await this.giveRewardItem(playerSchema, itemKey, rewardItems[itemKey])){
                return false;
            }
            givenItems[itemKey] = true;
            rewardState.mappedState.givenItems = givenItems;
            if(!await this.saveRewardState(rewardState, playerSchema, message)){
                return false;
            }
        }
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @param {string} itemKey
     * @param {number} quantity
     * @returns {Promise<boolean>}
     */
    async giveRewardItem(playerSchema, itemKey, quantity)
    {
        try {
            return false !== await this.giveRewardAction.execute(playerSchema, itemKey, quantity);
        } catch (error) {
            Logger.error('There was an error while giving the reward item "'+itemKey+'".', error.message);
            return false;
        }
    }

}

module.exports.RewardsEventsMessageActions = RewardsEventsMessageActions;
