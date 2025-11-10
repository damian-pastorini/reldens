/**
 *
 * Reldens - RewardsEventsProvider
 *
 */

const { RewardsEventsMapper } = require('./mappers/rewards-events-mapper');
const { RepositoriesExtension } = require('./repositories-extension');
const { sc } = require('@reldens/utils');

class RewardsEventsProvider extends RepositoriesExtension
{

    constructor(props)
    {
        super();
        this.rewardsEventsMapper = new RewardsEventsMapper();
        this.isReady = this.assignRepositories(props);
        let config = props?.config?.getWithoutLogs('client/rewards') || {};
        this.showRewardImage = sc.get(config, 'showRewardImage', true);
        this.defaultRewardImage = sc.get(config, 'defaultRewardImage', 'default-reward.png');
        this.defaultRewardImagePath = sc.get(config, 'showRewardImage', '/assets/custom/rewards/');
        this.activeRewardsEvents = false;
        this.activeRewardsEventsMappedData = false;
    }

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

    async fetchActiveRewardsWithMappedData()
    {
        if(!this.activeRewardsEventsMappedData && this.isReady){
            this.rewardsEventsRepository.sortBy = 'position';
            let activeRewards = this.filterActiveRewardsByDates(await this.fetchActiveRewardsEvents());
            this.rewardsEventsRepository.sortBy = false;
            for(let reward of activeRewards){
                await this.mapRewardDataFromModel(reward, true);
            }
            this.activeRewardsEventsMappedData = activeRewards;
        }
        return this.activeRewardsEventsMappedData;
    }

    async fetchActiveRewardsEvents()
    {
        if(!this.activeRewardsEvents && this.isReady){
            this.activeRewardsEvents = await this.rewardsEventsRepository.load({enabled: 1});
        }
        return this.activeRewardsEvents;
    }

    async mapRewardDataFromModel(reward, withItems = false)
    {
        reward.eventData = sc.toJson(reward.event_data, {});
        reward.showRewardImage = sc.get(reward.eventData, 'showRewardImage', this.showRewardImage);
        reward.rewardImage = sc.get(reward.eventData, 'rewardImage', this.defaultRewardImage);
        reward.rewardImagePath = sc.get(reward.eventData, 'rewardImagePath', this.defaultRewardImagePath);
        if(withItems && reward.eventData.items){
            reward.itemsData = await this.fetchRewardItemsData(reward.eventData.items);
        }
        return reward;
    }

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
        if(!playerEventState){
            return [];
        }
        for(let eventState of playerEventState){
            eventState.mappedState = sc.toJson(eventState.state, {});
        }
        return playerEventState;
    }

    async fetchPlayerRewardsStateByIdWithMappedData(playerId, rewardId)
    {
        let playerEventState = await this.fetchPlayerActiveRewardsStateWithMappedData(playerId, rewardId);
        return playerEventState?.shift();
    }

    async fetchRewardItemsData(rewardItemsData)
    {
        let ids = Object.keys(rewardItemsData);
        let idsFilter = {id: {operator: 'IN', value: ids}};
        let items = await this.itemsRepository.load(idsFilter);
        let itemsMappedById = {};
        for(let item of items){
            item.rewardQuantity = rewardItemsData[item.id];
            itemsMappedById[item.id] = item;
        }
        return itemsMappedById;
    }

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
