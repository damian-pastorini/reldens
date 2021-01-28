/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 * Rooms Return Points storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');
const { RoomsModel } = require('./model');

class RoomsReturnPointsModel extends ModelClass
{

    static get tableName()
    {
        return 'rooms_return_points';
    }

    static get relationMappings()
    {
        return {
            parent_room: {
                relation: ModelClass.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_change_points.room_id',
                    to: 'rooms.id'
                }
            },
            from_room: {
                relation: ModelClass.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_return_points.from_room_id',
                    to: 'rooms.id'
                }
            }
        }
    }

}

module.exports.RoomsReturnPointsModel = RoomsReturnPointsModel;
