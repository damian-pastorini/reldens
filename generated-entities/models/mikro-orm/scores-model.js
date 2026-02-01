/**
 *
 * Reldens - ScoresModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ScoresModel
{

    constructor(id, player_id, total_score, players_kills_count, npcs_kills_count, last_player_kill_time, last_npc_kill_time, created_at, updated_at)
    {
        this.id = id;
        this.player_id = player_id;
        this.total_score = total_score;
        this.players_kills_count = players_kills_count;
        this.npcs_kills_count = npcs_kills_count;
        this.last_player_kill_time = last_player_kill_time;
        this.last_npc_kill_time = last_npc_kill_time;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static createByProps(props)
    {
        const {id, player_id, total_score, players_kills_count, npcs_kills_count, last_player_kill_time, last_npc_kill_time, created_at, updated_at} = props;
        return new this(id, player_id, total_score, players_kills_count, npcs_kills_count, last_player_kill_time, last_npc_kill_time, created_at, updated_at);
    }
    
}

const schema = new EntitySchema({
    class: ScoresModel,
    tableName: 'scores',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false },
        total_score: { type: 'number' },
        players_kills_count: { type: 'number' },
        npcs_kills_count: { type: 'number' },
        last_player_kill_time: { type: 'Date', nullable: true },
        last_npc_kill_time: { type: 'Date', nullable: true },
        created_at: { type: 'Date', nullable: true },
        updated_at: { type: 'Date', nullable: true },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        }
    },
});
schema._fkMappings = {
    "player_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    ScoresModel,
    entity: ScoresModel,
    schema: schema
};
