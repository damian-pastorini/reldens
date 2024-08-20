/**
 *
 * Reldens - RewardsEventsUpdater
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');
const { Logger } = require('@reldens/utils');

class RewardsEventsUpdater extends RepositoriesExtension
{

    constructor(props)
    {
        super();
        this.isReady = this.assignRepositories(props);
    }

    async updatePlayerRewards(rewardsData, attacker, obtainedScore, props)
    {
        if(!this.rewardsEventsRepository){
            return false;
        }
        let rewardsSaveResult = await this.rewardsEventsRepository.upsert(rewardsData);
        if(!rewardsSaveResult){
            Logger.error('Score could not be saved.', rewardsData);
            return false;
        }
        return rewardsSaveResult;
    }
}

module.exports.RewardsEventsUpdater = RewardsEventsUpdater;
