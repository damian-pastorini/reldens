/**
 *
 * Reldens - RewardsEventsMapper
 *
 * Maps reward events with player-specific state data, combining event definitions and player progress.
 * Every player gets its own copy of the events with its own state (or none), the cached events shared by every player
 * are never changed.
 *
 */

const { Logger, sc } = require('@reldens/utils');

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
        return rewardsEventsCollection.map(
            (rewardsEvents) => Object.assign(
                {},
                rewardsEvents,
                {eventState: sc.get(mappedStates, rewardsEvents.id, false)}
            )
        );
    }

}

module.exports.RewardsEventsMapper = RewardsEventsMapper;
