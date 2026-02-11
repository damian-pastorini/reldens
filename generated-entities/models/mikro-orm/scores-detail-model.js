/**
 *
 * Reldens - ScoresDetailModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ScoresDetailModel
{

    constructor(id, player_id, obtained_score, kill_time, kill_player_id, kill_npc_id)
    {
        this.id = id;
        this.player_id = player_id;
        this.obtained_score = obtained_score;
        this.kill_time = kill_time;
        this.kill_player_id = kill_player_id;
        this.kill_npc_id = kill_npc_id;
    }

    static createByProps(props)
    {
        const {id, player_id, obtained_score, kill_time, kill_player_id, kill_npc_id} = props;
        return new this(id, player_id, obtained_score, kill_time, kill_player_id, kill_npc_id);
    }
    
}

const schema = new EntitySchema({
    class: ScoresDetailModel,
    tableName: 'scores_detail',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false },
        obtained_score: { type: 'number' },
        kill_time: { type: 'Date', nullable: true },
        kill_player_id: { type: 'number', nullable: true },
        kill_npc_id: { type: 'number', nullable: true },
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
    ScoresDetailModel,
    entity: ScoresDetailModel,
    schema: schema
};
