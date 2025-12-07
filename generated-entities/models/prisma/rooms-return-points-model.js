/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 */

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

    static get tableName()
    {
        return 'rooms_return_points';
    }
    

    static get relationTypes()
    {
        return {
            rooms_rooms_return_points_from_room_idTorooms: 'one',
            rooms_rooms_return_points_room_idTorooms: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_rooms_room': 'rooms_rooms_return_points_from_room_idTorooms',
            'related_rooms_from_room': 'rooms_rooms_return_points_from_room_idTorooms',
            'related_rooms_return_points_from_room': 'rooms_rooms_return_points_from_room_idTorooms',
            'related_rooms_return_points_room': 'rooms_rooms_return_points_room_idTorooms'
        };
    }
}

module.exports.RoomsReturnPointsModel = RoomsReturnPointsModel;
