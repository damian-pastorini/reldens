/**
 *
 * Reldens - RewardsEventsStateModel
 *
 */

class RewardsEventsStateModel
{

    static get tableName()
    {
        return 'rewards_events_state';
    }

    static get relationMappings()
    {
        return {
            related_rewards_events: {
                relation: 'BelongsToOneRelation',
                tableName: 'rewards_events',
                from: 'rewards_events_id',
                to: 'id'
            },
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            }
        };
    }
}

module.exports.RewardsEventsStateModel = RewardsEventsStateModel;
