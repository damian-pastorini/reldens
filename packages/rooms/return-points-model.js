/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 * Rooms Return Points storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class RoomsReturnPointsModel extends Model
{

    static get tableName()
    {
        return 'rooms_return_points';
    }

    static get relationMappings()
    {
        // to avoid require loop:
        const Rooms = require('./model');
        return {
            parent_room: {
                relation: Model.BelongsToOneRelation,
                modelClass: Rooms,
                join: {
                    from: 'rooms_change_points.room_id',
                    to: 'rooms.id'
                }
            },
            to_room: {
                relation: Model.HasOneRelation,
                modelClass: Rooms,
                join: {
                    from: 'rooms_return_points.to_room_id',
                    to: 'rooms.id'
                }
            }
        }
    }

}

module.exports = RoomsReturnPointsModel;
