/**
 *
 * Reldens - RewardsEventsMapper
 *
 */

const { Logger } = require('@reldens/utils');

class RewardsEventsMapper
{

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
