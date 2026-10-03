/**
 *
 * Reldens - RoomsChangePointsModel
 *
 */

class RoomsChangePointsModel
{

    static get tableName()
    {
        return 'rooms_change_points';
    }

    static get relationMappings()
    {
        return {
            related_rooms_room: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'room_id',
                to: 'id'
            },
            related_rooms_next_room: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'next_room_id',
                to: 'id'
            }
        };
    }
}

module.exports.RoomsChangePointsModel = RoomsChangePointsModel;
