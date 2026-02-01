/**
 *
 * Reldens - RoomsChangePointsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class RoomsChangePointsModel
{

    constructor(id, room_id, tile_index, next_room_id)
    {
        this.id = id;
        this.room_id = room_id;
        this.tile_index = tile_index;
        this.next_room_id = next_room_id;
    }

    static createByProps(props)
    {
        const {id, room_id, tile_index, next_room_id} = props;
        return new this(id, room_id, tile_index, next_room_id);
    }
    
}

const schema = new EntitySchema({
    class: RoomsChangePointsModel,
    tableName: 'rooms_change_points',
    properties: {
        id: { type: 'number', primary: true },
        room_id: { type: 'number', persist: false },
        tile_index: { type: 'number' },
        next_room_id: { type: 'number', persist: false },
        related_rooms_room: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'room_id'
        },
        related_rooms_next_room: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'next_room_id'
        }
    },
});
schema._fkMappings = {
    "room_id": {
        "relationKey": "related_rooms_room",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "next_room_id": {
        "relationKey": "related_rooms_next_room",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    RoomsChangePointsModel,
    entity: RoomsChangePointsModel,
    schema: schema
};
