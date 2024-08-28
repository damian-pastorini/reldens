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

    async updateStateById(rewardEventStateId, state)
    {
        if(!this.rewardsEventsStateRepository){
            return false;
        }
        let rewardsSaveResult = await this.rewardsEventsStateRepository.updateById(rewardEventStateId, {state});
        if(!rewardsSaveResult){
            Logger.error('State could not be saved.', rewardEventStateId, state);
            return false;
        }
        return rewardsSaveResult;
    }
}

module.exports.RewardsEventsUpdater = RewardsEventsUpdater;
