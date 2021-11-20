/**
 *
 * Reldens - RoomsReturnPointsModel
 *
 * Rooms Return Points storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RoomsReturnPointsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rooms_return_points';
    }

    static get relationMappings()
    {
        const { RoomsModel } = require('./rooms-model');
        return {
            parent_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_change_points.room_id',
                    to: 'rooms.id'
                }
            },
            from_room: {
                relation: this.HasOneRelation,
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
