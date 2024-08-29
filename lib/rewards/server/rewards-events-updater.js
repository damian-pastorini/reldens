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

    async updateStateById(rewardEventStateId, state, rewardEventId, playerId)
    {
        if(!this.rewardsEventsStateRepository){
            return false;
        }
        if(!rewardEventStateId){
            return await this.rewardsEventsStateRepository.create({
                rewards_events_id: rewardEventId,
                player_id: playerId,
                state
            });
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
