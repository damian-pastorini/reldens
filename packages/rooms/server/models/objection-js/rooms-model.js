/**
 *
 * Reldens - RoomsModel
 *
 * Rooms storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RoomsModel extends ObjectionJsRawModel
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
                relation: this.HasManyRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.room_id'
                }
            },
            rooms_return_points: {
                relation: this.HasManyRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_return_points.room_id'
                }
            },
            next_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.next_room_id'
                }
            },
            from_room: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: 'rooms.id',
                    to: 'rooms_change_points.next_room_id'
                }
            }
        };
    }

    static loadFullData()
    {
        return this.query()
            .withGraphFetched('[rooms_change_points.next_room, rooms_return_points.from_room]');
    }

    static loadById(roomId)
    {
        return this.query()
            .withGraphFetched('[rooms_change_points.next_room, rooms_return_points.from_room]')
            .findById(roomId);
    }

    static loadByName(name)
    {
        return this.query()
            .withGraphFetched('[rooms_change_points.next_room, rooms_return_points.from_room]')
            .where('name', name)
            .first();
    }

}

module.exports.RoomsModel = RoomsModel;
