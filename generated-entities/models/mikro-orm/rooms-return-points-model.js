/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class RoomsReturnPointsModel
{

    constructor(id, room_id, direction, x, y, is_default, from_room_id)
    {
        this.id = id;
        this.room_id = room_id;
        this.direction = direction;
        this.x = x;
        this.y = y;
        this.is_default = is_default;
        this.from_room_id = from_room_id;
    }

    static createByProps(props)
    {
        const {id, room_id, direction, x, y, is_default, from_room_id} = props;
        return new this(id, room_id, direction, x, y, is_default, from_room_id);
    }
    
}

const schema = new EntitySchema({
    class: RoomsReturnPointsModel,
    tableName: 'rooms_return_points',
    properties: {
        id: { type: 'number', primary: true },
        room_id: { type: 'number', persist: false },
        direction: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        is_default: { type: 'number', nullable: true },
        from_room_id: { type: 'number', persist: false },
        related_rooms_room: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'room_id'
        },
        related_rooms_from_room: {
            kind: 'm:1',
            entity: 'RoomsModel',
            joinColumn: 'from_room_id'
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
    "from_room_id": {
        "relationKey": "related_rooms_from_room",
        "entityName": "RoomsModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    RoomsReturnPointsModel,
    entity: RoomsReturnPointsModel,
    schema: schema
};
