/**
 *
 * Reldens - RewardsEventsProvider
 *
 */

const { RewardsEventsMapper } = require('./mappers/rewards-events-mapper');
const { RepositoriesExtension } = require('./repositories-extension');

class RewardsEventsProvider extends RepositoriesExtension
{

    constructor(props)
    {
        super();
        this.rewardsEventsMapper = new RewardsEventsMapper();
        this.isReady = this.assignRepositories(props);
    }

    async fetchPlayerActiveRewards(playerId)
    {
        if(!this.rewardsEventsRepository){
            return false;
        }
        let activeRewardsEventsCollection = await this.fetchActiveRewards();
        let playerRewardsEventsStateCollection = await this.fetchPlayerActiveRewardsState(playerId);
        return this.rewardsEventsMapper.withPlayerRewardsEventsState(
            activeRewardsEventsCollection,
            playerRewardsEventsStateCollection
        );
    }

    async fetchActiveRewards()
    {
        return await this.rewardsEventsRepository.load({enabled: 1});
    }

    async fetchPlayerActiveRewardsState(playerId)
    {
        return await this.rewardsEventsStateRepository.load({player_id: playerId});
    }
}

module.exports.RewardsEventsProvider = RewardsEventsProvider;
