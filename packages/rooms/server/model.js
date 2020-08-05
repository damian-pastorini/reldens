/**
 *
 * Reldens - RoomsModel
 *
 * Rooms storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class RoomsModel extends Model
{

    static get tableName()
    {
        return 'rooms';
    }

    static get relationMappings()
    {
        const { RoomsChangePointsModel } = require('./change-points-model');
        const { RoomsReturnPointsModel } = require('./return-points-model');
        return {
            rooms_change_points: {
                relation: Model.HasManyRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.room_id'
                }
            },
            rooms_return_points: {
                relation: Model.HasManyRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_return_points.room_id'
                }
            },
            next_room: {
                relation: Model.BelongsToOneRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.next_room_id'
                }
            },
            to_room: {
                relation: Model.BelongsToOneRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.next_room_id'
                }
            }
        };
    }

}

module.exports.RoomsModel = RoomsModel;
