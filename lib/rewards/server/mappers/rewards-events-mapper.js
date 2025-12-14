/**
 *
 * Reldens - RewardsEventsMapper
 *
 * Maps reward events with player-specific state data, combining event definitions and player progress.
 *
 */

const { Logger } = require('@reldens/utils');

class RewardsEventsMapper
{

    /**
     * @param {Array<Object>|boolean} rewardsEventsCollection
     * @param {Array<Object>} playerRewardsEventsStateCollection
     * @returns {Array<Object>}
     */
    withPlayerRewardsEventsState(rewardsEventsCollection, playerRewardsEventsStateCollection)
    {
        if(!playerRewardsEventsStateCollection){
            return rewardsEventsCollection;
        }
        let mappedStates = {};
        for(let state of playerRewardsEventsStateCollection){
            mappedStates[state['rewards_events_id']] = state;
        }
        if(!rewardsEventsCollection){
            Logger.error('Missing RewardsEventsCollection');
            return [];
        }
        return rewardsEventsCollection.map((rewardsEvents) => {
            let state = mappedStates[rewardsEvents.id];
            if(state){
                rewardsEvents.eventState = state;
            }
            return rewardsEvents;
        });
    }

}

module.exports.RewardsEventsMapper = RewardsEventsMapper;
