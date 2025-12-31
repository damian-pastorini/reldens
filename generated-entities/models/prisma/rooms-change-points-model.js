/**
 *
 * Reldens - RoomsChangePointsModel
 *
 */

class RoomsChangePointsModel
{

    constructor(id, room_id, tile_index, next_room_id)
    {
        this.id = id;
        this.room_id = room_id;
        this.tile_index = tile_index;
        this.next_room_id = next_room_id;
    }

    static get tableName()
    {
        return 'rooms_change_points';
    }
    

    static get relationTypes()
    {
        return {
            rooms_rooms_change_points_room_idTorooms: 'one',
            rooms_rooms_change_points_next_room_idTorooms: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_rooms_room': 'rooms_rooms_change_points_room_idTorooms',
            'related_rooms_next_room': 'rooms_rooms_change_points_next_room_idTorooms',
            'related_rooms_change_points_room': 'rooms_rooms_change_points_room_idTorooms',
            'related_rooms_change_points_next_room': 'rooms_rooms_change_points_next_room_idTorooms'
        };
    }
}

module.exports.RoomsChangePointsModel = RoomsChangePointsModel;
