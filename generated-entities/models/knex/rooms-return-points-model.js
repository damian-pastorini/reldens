/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 */

class RoomsReturnPointsModel
{

    static get tableName()
    {
        return 'rooms_return_points';
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
            related_rooms_from_room: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'from_room_id',
                to: 'id'
            }
        };
    }
}

module.exports.RoomsReturnPointsModel = RoomsReturnPointsModel;
