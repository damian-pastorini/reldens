/**
 *
 * Reldens - RoomsChangePointsModel
 *
 * Rooms Change Points storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { RoomsModel } = require('./rooms-model');

class RoomsChangePointsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rooms_change_points';
    }

    static get relationMappings()
    {
        return {
            parent_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_change_points.room_id',
                    to: 'rooms.id'
                }
            },
            next_room: {
                relation: this.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: 'rooms_change_points.next_room_id',
                    to: 'rooms.id'
                }
            }
        }
    }

}

module.exports.RoomsChangePointsModel = RoomsChangePointsModel;
