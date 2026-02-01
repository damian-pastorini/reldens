/**
 *
 * Reldens - PlayersStateModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class PlayersStateModel
{

    constructor(id, player_id, room_id, x, y, dir)
    {
        this.id = id;
        this.player_id = player_id;
        this.room_id = room_id;
        this.x = x;
        this.y = y;
        this.dir = dir;
    }

    static createByProps(props)
    {
        const {id, player_id, room_id, x, y, dir} = props;
        return new this(id, player_id, room_id, x, y, dir);
    }
    
}

const schema = new EntitySchema({
    class: PlayersStateModel,
    tableName: 'players_state',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false },
        room_id: { type: 'number', persist: false },
        x: { type: 'number' },
        y: { type: 'number' },
        dir: { type: 'string' },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        },
        related_rooms: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'room_id'
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
    "room_id": {
        "relationKey": "related_rooms",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    PlayersStateModel,
    entity: PlayersStateModel,
    schema: schema
};
