/**
 *
 * Reldens - RewardsEventsProvider
 *
 * Provides reward events data by fetching, filtering, and mapping rewards from the database with player-specific state.
 *
 */

const { RewardsEventsMapper } = require('./mappers/rewards-events-mapper');
const { RepositoriesExtension } = require('./repositories-extension');
const { sc } = require('@reldens/utils');

class RewardsEventsProvider extends RepositoriesExtension
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super();
        /** @type {RewardsEventsMapper} */
        this.rewardsEventsMapper = new RewardsEventsMapper();
        /** @type {boolean} */
        this.isReady = this.assignRepositories(props);
        let config = props?.config?.getWithoutLogs('client/rewards') || {};
        /** @type {boolean} */
        this.showRewardImage = sc.get(config, 'showRewardImage', true);
        /** @type {string} */
        this.defaultRewardImage = sc.get(config, 'defaultRewardImage', 'default-reward.png');
        /** @type {string} */
        this.defaultRewardImagePath = sc.get(config, 'showRewardImage', '/assets/custom/rewards/');
        /** @type {Array<Object>|boolean} */
        this.activeRewardsEvents = false;
        /** @type {Array<Object>|boolean} */
        this.activeRewardsEventsMappedData = false;
    }

    /**
     * @param {number} playerId
     * @returns {Promise<Object|boolean>}
     */
    async fetchPlayerActiveRewards(playerId)
    {
        if(!this.rewardsEventsRepository){
            return false;
        }
        return this.rewardsEventsMapper.withPlayerRewardsEventsState(
            await this.fetchActiveRewardsWithMappedData(),
            await this.fetchPlayerActiveRewardsStateWithMappedData(playerId)
        );
    }

    /**
     * @returns {Promise<Array<Object>|boolean>}
     */
    async fetchActiveRewardsWithMappedData()
    {
        if(!this.activeRewardsEventsMappedData && this.isReady){
            this.rewardsEventsRepository.sortBy = 'position';
            let activeRewards = this.filterActiveRewardsByDates(await this.fetchActiveRewardsEvents());
            this.rewardsEventsRepository.sortBy = false;
            for(let rewardEvent of activeRewards){
                await this.mapRewardDataFromModel(rewardEvent, true);
            }
            this.activeRewardsEventsMappedData = activeRewards;
        }
        return this.activeRewardsEventsMappedData;
    }

    /**
     * @returns {Promise<Array<Object>|boolean>}
     */
    async fetchActiveRewardsEvents()
    {
        if(!this.activeRewardsEvents && this.isReady){
            this.activeRewardsEvents = await this.rewardsEventsRepository.load({enabled: 1});
        }
        return this.activeRewardsEvents;
    }

    /**
     * @param {Object} rewardEvent
     * @param {boolean} withItems
     * @returns {Promise<Object>}
     */
    async mapRewardDataFromModel(rewardEvent, withItems = false)
    {
        //Logger.debug('Map reward data from model:', rewardEvent);
        rewardEvent.eventData = sc.toJson(rewardEvent.event_data, {});
        rewardEvent.showRewardImage = sc.get(rewardEvent.eventData, 'showRewardImage', this.showRewardImage);
        rewardEvent.rewardImage = sc.get(rewardEvent.eventData, 'rewardImage', this.defaultRewardImage);
        rewardEvent.rewardImagePath = sc.get(rewardEvent.eventData, 'rewardImagePath', this.defaultRewardImagePath);
        if(withItems && rewardEvent.eventData.items){
            rewardEvent.itemsData = await this.fetchRewardItemsData(rewardEvent.eventData.items);
        }
        return rewardEvent;
    }

    /**
     * @param {number} playerId
     * @param {number} rewardId
     * @returns {Promise<Object|boolean>}
     */
    async fetchPlayerRewardStateWithRewardMappedData(playerId, rewardId)
    {
        let rewardState = await this.rewardsEventsStateRepository.loadOneWithRelations(
            {rewards_events_id: rewardId, player_id: playerId},
            ['related_rewards_events']
        );
        if(!rewardState){
            return false;
        }
        rewardState.mappedState = sc.toJson(rewardState.state, {});
        rewardState.reward = await this.mapRewardDataFromModel(rewardState.related_rewards_events, false);
        return rewardState;
    }

    /**
     * @param {number} playerId
     * @param {number} rewardId
     * @returns {Promise<Array<Object>>}
     */
    async fetchPlayerActiveRewardsStateWithMappedData(playerId, rewardId)
    {
        if(!playerId){
            return [];
        }
        let filters = {player_id: playerId};
        if(rewardId){
            filters.rewards_events_id = rewardId;
        }
        let playerEventState = await this.rewardsEventsStateRepository.load(filters);
        //Logger.debug('Fetch player active rewards state:', filters, playerEventState);
        if(!playerEventState){
            return [];
        }
        for(let eventState of playerEventState){
            eventState.mappedState = sc.toJson(eventState.state, {});
        }
        return playerEventState;
    }

    /**
     * @param {number} playerId
     * @param {number} rewardId
     * @returns {Promise<Object|undefined>}
     */
    async fetchPlayerRewardsStateByIdWithMappedData(playerId, rewardId)
    {
        let playerEventState = await this.fetchPlayerActiveRewardsStateWithMappedData(playerId, rewardId);
        return playerEventState?.shift();
    }

    /**
     * @param {Object<string, number>} rewardItemsData
     * @returns {Promise<Object<number, Object>>}
     */
    async fetchRewardItemsData(rewardItemsData)
    {
        let itemKeys = Object.keys(rewardItemsData);
        let keysFilter = {key: {operator: 'IN', value: itemKeys}};
        let items = await this.itemsRepository.load(keysFilter);
        let itemsMappedById = {};
        for(let item of items){
            item.rewardQuantity = rewardItemsData[item.key];
            itemsMappedById[item.id] = item;
        }
        return itemsMappedById;
    }

    /**
     * @param {Array<Object>} rewards
     * @returns {Array<Object>}
     */
    filterActiveRewardsByDates(rewards)
    {
        return rewards.filter((reward) => {
            if(!reward.active_from && !reward.active_to){
                return true;
            }
            let currentDate = new Date();
            if(reward.active_from){
                let activeFrom = new Date(reward.active_from);
                if(activeFrom > currentDate){
                    return false;
                }
            }
            if(reward.active_to){
                let activeTo = new Date(reward.active_to);
                if(activeTo < currentDate){
                    return false;
                }
            }
            return true;
        });
    }
}

module.exports.RewardsEventsProvider = RewardsEventsProvider;
