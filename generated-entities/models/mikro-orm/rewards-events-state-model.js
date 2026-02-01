/**
 *
 * Reldens - RewardsEventsStateModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class RewardsEventsStateModel
{

    constructor(id, rewards_events_id, player_id, state)
    {
        this.id = id;
        this.rewards_events_id = rewards_events_id;
        this.player_id = player_id;
        this.state = state;
    }

    static createByProps(props)
    {
        const {id, rewards_events_id, player_id, state} = props;
        return new this(id, rewards_events_id, player_id, state);
    }
    
}

const schema = new EntitySchema({
    class: RewardsEventsStateModel,
    tableName: 'rewards_events_state',
    properties: {
        id: { type: 'number', primary: true },
        rewards_events_id: { type: 'number', persist: false },
        player_id: { type: 'number', persist: false },
        state: { type: 'string', nullable: true },
        related_rewards_events: {
            kind: 'm:1',
            entity: 'RewardsEventsModel',
            joinColumn: 'rewards_events_id'
        },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        }
    },
});
schema._fkMappings = {
    "rewards_events_id": {
        "relationKey": "related_rewards_events",
        "entityName": "RewardsEventsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "player_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    RewardsEventsStateModel,
    entity: RewardsEventsStateModel,
    schema: schema
};
