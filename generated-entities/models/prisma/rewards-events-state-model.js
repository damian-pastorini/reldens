/**
 *
 * Reldens - RewardsEventsStateModel
 *
 */

class RewardsEventsStateModel
{

    constructor(id, rewards_events_id, player_id, state)
    {
        this.id = id;
        this.rewards_events_id = rewards_events_id;
        this.player_id = player_id;
        this.state = state;
    }

    static get tableName()
    {
        return 'rewards_events_state';
    }
    

    static get relationTypes()
    {
        return {
            rewards_events: 'one',
            players: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_rewards_events': 'rewards_events',
            'related_players': 'players'
        };
    }
}

module.exports.RewardsEventsStateModel = RewardsEventsStateModel;
