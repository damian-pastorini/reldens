/**
 *
 * Reldens - RewardsEventsUpdater
 *
 * Updates reward event state in the database, creating new records or updating existing ones based on player progress.
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');
const { Logger } = require('@reldens/utils');

class RewardsEventsUpdater extends RepositoriesExtension
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super();
        /** @type {boolean} */
        this.isReady = this.assignRepositories(props);
    }

    /**
     * @param {number|boolean} rewardEventStateId
     * @param {string} state
     * @param {number} rewardEventId
     * @param {number} playerId
     * @returns {Promise<Object|boolean>}
     */
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
