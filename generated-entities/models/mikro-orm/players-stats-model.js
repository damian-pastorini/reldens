/**
 *
 * Reldens - PlayersStatsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class PlayersStatsModel
{

    constructor(id, player_id, stat_id, base_value, value)
    {
        this.id = id;
        this.player_id = player_id;
        this.stat_id = stat_id;
        this.base_value = base_value;
        this.value = value;
    }

    static createByProps(props)
    {
        const {id, player_id, stat_id, base_value, value} = props;
        return new this(id, player_id, stat_id, base_value, value);
    }
    
}

const schema = new EntitySchema({
    class: PlayersStatsModel,
    tableName: 'players_stats',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false },
        stat_id: { type: 'number', persist: false },
        base_value: { type: 'number' },
        value: { type: 'number' },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        },
        related_stats: {
            kind: 'm:1',
            entity: 'StatsModel',
            joinColumn: 'stat_id'
        }
    },
});
schema._fkMappings = {
    "player_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "stat_id": {
        "relationKey": "related_stats",
        "entityName": "StatsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    PlayersStatsModel,
    entity: PlayersStatsModel,
    schema: schema
};
