/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 * Rooms Return Points storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');
const { RoomsModel } = require('./model');

class RoomsReturnPointsModel extends Model
{

    static get tableName()
    {
        return 'rooms_return_points';
    }

    static get relationMappings()
    {
        return {
            parent_room: {
                relation: Model.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_change_points.room_id',
                    to: 'rooms.id'
                }
            },
            to_room: {
                relation: Model.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_return_points.to_room_id',
                    to: 'rooms.id'
                }
            }
        }
    }

}

module.exports.RoomsReturnPointsModel = RoomsReturnPointsModel;
